import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

export function MultiDepartmentForm() {
  const { user } = useAuth()
  const [uhid, setUhid] = useState('')
  const [patientName, setPatientName] = useState('')
  const [ward, setWard] = useState('')
  const [unitNo, setUnitNo] = useState('')
  const [checklists, setChecklists] = useState([])
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [userDepartment, setUserDepartment] = useState(null)

  // UHID is entered manually from OP card - no database lookup needed
  // Patient record will be created automatically when form is submitted

  const loadChecklists = async () => {
    if (!uhid.trim()) {
      setMessage('Please enter UHID')
      return
    }

    setLoading(true)
    setMessage('')
    try {
      const data = await apiClient.get(`/audits/patient-checklists?uhid=${uhid.trim().toUpperCase()}`)
      
      setPatientName(data.patient.patientName)
      if (data.patient.ward) setWard(data.patient.ward)
      if (data.patient.unitNo) setUnitNo(data.patient.unitNo)
      setUserDepartment(data.userDepartment)
      setChecklists(data.checklists || [])

      // Initialize answers from existing submissions
      const initialAnswers = {}
      data.checklists.forEach((checklist) => {
        checklist.items.forEach(({ item, submission }) => {
          const key = `${checklist.department._id}_${checklist.form._id}_${item._id}`
          if (submission) {
            initialAnswers[key] = {
              yesNoNa: submission.yesNoNa || '',
              responseValue: submission.responseValue || submission.yesNoNa || '',
              remarks: submission.remarks || '',
              responsibility: submission.responsibility || '',
            }
          } else {
            initialAnswers[key] = {
              yesNoNa: '',
              responseValue: '',
              remarks: '',
              responsibility: '',
            }
          }
        })
      })
      setAnswers(initialAnswers)
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to load checklists'
      setMessage(errorMsg)
      setChecklists([])
    } finally {
      setLoading(false)
    }
  }

  const updateAnswer = (key, field, value) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [field]: value },
    }))
  }

  const handleSubmit = async (e, checklist) => {
    e.preventDefault()

    if (!patientName.trim()) {
      setMessage('Please enter Patient Name')
      return
    }
    
    if (!ward.trim()) {
      setMessage('Please enter Ward')
      return
    }
    
    if (!unitNo.trim()) {
      setMessage('Please enter Unit No')
      return
    }

    // Validate that remarks are provided when NO is selected
    for (const { item } of checklist.items) {
      const key = `${checklist.department._id}_${checklist.form._id}_${item._id}`
      const answer = answers[key]
      if (answer?.responseValue === 'NO' && (!answer?.remarks || !answer.remarks.trim())) {
        setMessage(`Remarks are required when "NO" is selected for: ${item.label}`)
        return
      }
    }

    setSubmitting(true)
    setMessage('')
    try {
      const payload = {
        departmentId: checklist.department._id,
        formTemplateId: checklist.form._id,
        uhid: uhid.trim().toUpperCase(),
        patientName: patientName.trim(),
        ward: ward.trim(),
        unitNo: unitNo.trim(),
        items: checklist.items.map(({ item }) => {
          const key = `${checklist.department._id}_${checklist.form._id}_${item._id}`
          return {
            checklistItemId: item._id,
            ...answers[key],
          }
        }),
      }

      await apiClient.post('/audits', payload)
      setMessage(`✅ ${checklist.department.name} checklist submitted successfully!`)
      
      // Reload checklists to show updated lock status
      setTimeout(() => {
        loadChecklists()
      }, 1000)
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to submit checklist'
      setMessage(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  // Group items by section
  const groupItemsBySection = (items) => {
    return items.reduce((acc, { item, submission }) => {
      const section = item.section || 'Other'
      if (!acc[section]) acc[section] = []
      acc[section].push({ item, submission })
      return acc
    }, {})
  }

  // Check if user can edit this checklist
  const canEditChecklist = (checklist) => {
    if (!checklist.canEdit) return false
    if (checklist.isLocked) return false
    if (user?.role === 'admin') return true
    if (checklist.isCommon) return true // Common checklists (ANAE, NUS) can be edited by anyone
    if (userDepartment && checklist.department._id === userDepartment._id) return true
    return false
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-xl p-6">
        <h2 className="text-2xl font-bold mb-2">Multi-Department Checklist</h2>
        <p className="text-blue-100">View and submit checklists for all departments</p>
      </div>

      {/* UHID Search */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              UHID * <span className="text-xs text-slate-500 font-normal">(Enter from OP Card)</span>
            </label>
            <input
              type="text"
              value={uhid}
              onChange={(e) => setUhid(e.target.value.toUpperCase())}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="Enter UHID from OP Card"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Patient Name *</label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="Enter patient name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Ward <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Ward"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Unit No <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={unitNo}
              onChange={(e) => setUnitNo(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Unit No"
              required
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={loadChecklists}
            disabled={loading || !uhid.trim()}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Loading...' : 'Load Checklists'}
          </button>
        </div>
        {userDepartment && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Your Department:</strong> {userDepartment.name} ({userDepartment.code})
            </p>
            <p className="text-xs text-blue-600 mt-1">
              You can edit your department's checklist and common checklists (ANAE, NUS) until submission.
              Other departments' checklists are view-only.
            </p>
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.includes('✅')
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message}
        </div>
      )}

      {/* Checklists */}
      {checklists.length > 0 && (
        <div className="space-y-6">
          {checklists.map((checklist, idx) => {
            const editable = canEditChecklist(checklist)
            const itemsBySection = groupItemsBySection(checklist.items)

            return (
              <div
                key={idx}
                className={`bg-white rounded-lg shadow-lg border-2 ${
                  editable
                    ? 'border-blue-300'
                    : checklist.isLocked
                    ? 'border-red-300'
                    : 'border-slate-300'
                }`}
              >
                {/* Checklist Header */}
                <div
                  className={`p-4 rounded-t-lg ${
                    editable
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                      : checklist.isLocked
                      ? 'bg-gradient-to-r from-red-600 to-red-700 text-white'
                      : 'bg-gradient-to-r from-slate-600 to-slate-700 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">
                        {checklist.department.name} ({checklist.department.code})
                      </h3>
                      <p className="text-sm opacity-90">{checklist.form.name}</p>
                    </div>
                    <div className="text-right">
                      {checklist.isLocked && (
                        <span className="inline-flex items-center px-3 py-1 bg-red-500 rounded-full text-xs font-semibold">
                          🔒 Locked
                        </span>
                      )}
                      {editable && !checklist.isLocked && (
                        <span className="inline-flex items-center px-3 py-1 bg-green-500 rounded-full text-xs font-semibold">
                          ✏️ Editable
                        </span>
                      )}
                      {!editable && !checklist.isLocked && (
                        <span className="inline-flex items-center px-3 py-1 bg-yellow-500 rounded-full text-xs font-semibold">
                          👁️ View Only
                        </span>
                      )}
                      {checklist.isCommon && (
                        <span className="inline-flex items-center px-3 py-1 bg-purple-500 rounded-full text-xs font-semibold ml-2">
                          Common
                        </span>
                      )}
                    </div>
                  </div>
                  {checklist.submittedAt && (
                    <p className="text-xs mt-2 opacity-75">
                      Submitted: {new Date(checklist.submittedAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Checklist Items */}
                <div className="p-6">
                  {Object.keys(itemsBySection)
                    .sort()
                    .map((sectionName) => (
                      <div key={sectionName} className="mb-6">
                        <h4 className="text-md font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-200">
                          {sectionName}
                        </h4>
                        <div className="space-y-4">
                          {itemsBySection[sectionName].map(({ item, submission }) => {
                            const key = `${checklist.department._id}_${checklist.form._id}_${item._id}`
                            const answer = answers[key] || {}
                            const isReadOnly = !editable || checklist.isLocked

                            return (
                              <div
                                key={item._id}
                                className="p-4 border border-slate-200 rounded-lg bg-slate-50"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-800 mb-2">
                                      {item.label}
                                      {item.isMandatory && (
                                        <span className="text-red-500 ml-1">*</span>
                                      )}
                                    </label>

                                    {/* Response */}
                                    <div className="flex gap-4 mb-3">
                                      {['YES', 'NO'].map((option) => (
                                        <label
                                          key={option}
                                          className={`flex items-center gap-2 cursor-pointer ${
                                            isReadOnly ? 'opacity-50 cursor-not-allowed' : ''
                                          }`}
                                        >
                                          <input
                                            type="radio"
                                            name={`response_${key}`}
                                            value={option}
                                            checked={
                                              (answer.responseValue || answer.yesNoNa || '').toUpperCase() ===
                                              option
                                            }
                                            onChange={(e) =>
                                              !isReadOnly &&
                                              updateAnswer(key, 'responseValue', e.target.value)
                                            }
                                            disabled={isReadOnly}
                                            className="w-4 h-4 text-blue-600"
                                          />
                                          <span className="text-sm text-slate-700">{option}</span>
                                        </label>
                                      ))}
                                    </div>

                                    {/* Remarks */}
                                    <div className="mb-3">
                                      <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Remarks
                                      </label>
                                      <textarea
                                        value={answer.remarks || ''}
                                        onChange={(e) =>
                                          !isReadOnly && updateAnswer(key, 'remarks', e.target.value)
                                        }
                                        disabled={isReadOnly}
                                        rows={2}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                                      />
                                    </div>

                                    {/* Responsibility */}
                                    <div>
                                      <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Responsibility
                                      </label>
                                      <input
                                        type="text"
                                        value={answer.responsibility || ''}
                                        onChange={(e) =>
                                          !isReadOnly &&
                                          updateAnswer(key, 'responsibility', e.target.value)
                                        }
                                        disabled={isReadOnly}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}

                  {/* Submit Button */}
                  {editable && !checklist.isLocked && (
                    <div className="mt-6 pt-4 border-t border-slate-200">
                      <button
                        onClick={(e) => handleSubmit(e, checklist)}
                        disabled={submitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        {submitting ? 'Submitting...' : `Submit ${checklist.department.name} Checklist`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {checklists.length === 0 && !loading && uhid && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center border-2 border-dashed border-slate-300">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-slate-600 text-lg font-medium mb-2">No checklists found</p>
          <p className="text-sm text-slate-500">
            Enter a UHID and click "Load Checklists" to view all department checklists for this patient
          </p>
        </div>
      )}
    </div>
  )
}

