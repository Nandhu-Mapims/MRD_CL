import { useEffect, useState } from 'react'
import { apiClient } from '../api/client'
import { useAuth } from '../context/AuthContext'

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'CLOSED']

export function EditAuditModal({ isOpen, onClose, uhid, departmentId, onSuccess }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [department, setDepartment] = useState(null)
  const [items, setItems] = useState([])
  const [answers, setAnswers] = useState({})
  const [patientName, setPatientName] = useState('')
  const [availableDepartments, setAvailableDepartments] = useState([])
  const [selectedDeptId, setSelectedDeptId] = useState(departmentId || '')

  // Load submission data when modal opens
  useEffect(() => {
    if (isOpen && uhid) {
      loadSubmissionData()
    }
  }, [isOpen, uhid, selectedDeptId])

  // Load available departments for this UHID
  useEffect(() => {
    if (isOpen && uhid) {
      loadAvailableDepartments()
    }
  }, [isOpen, uhid])

  const loadAvailableDepartments = async () => {
    try {
      // Get all submissions for this UHID to find which departments have data
      const submissions = await apiClient.get(`/audits?uhid=${uhid}`)
      const deptIds = [...new Set(submissions.map(s => {
        const deptId = s.department?._id || s.department?._id?.toString() || s.department?.toString() || s.department
        return deptId?.toString()
      }).filter(Boolean))]
      
      // Get department details
      const allDepts = await apiClient.get('/departments')
      const depts = allDepts.filter(d => {
        const dId = d._id?.toString() || d._id?.toString()
        return deptIds.includes(dId)
      })
      setAvailableDepartments(depts)
      
      // Set initial department if provided, otherwise use first available
      if (departmentId) {
        const deptIdStr = departmentId?.toString() || departmentId
        if (depts.find(d => {
          const dId = d._id?.toString() || d._id?.toString()
          return dId === deptIdStr
        })) {
          setSelectedDeptId(departmentId)
        } else if (depts.length > 0) {
          setSelectedDeptId(depts[0]._id?.toString() || depts[0]._id)
        }
      } else if (depts.length > 0) {
        setSelectedDeptId(depts[0]._id?.toString() || depts[0]._id)
      }
    } catch (err) {
      console.error('Error loading departments:', err)
      // If error, just use the provided departmentId
      if (departmentId) {
        setSelectedDeptId(departmentId)
      }
    }
  }

  const loadSubmissionData = async () => {
    if (!selectedDeptId) return
    
    setLoading(true)
    setMessage('')
    try {
      const [data, depts, checklist] = await Promise.all([
        apiClient.get(`/audits/edit?uhid=${uhid}&departmentId=${selectedDeptId}`),
        apiClient.get('/departments'),
        apiClient.get(`/checklists/department/${selectedDeptId}`),
      ])

      setDepartment(depts.find((d) => d._id === selectedDeptId) || null)
      setItems(checklist)
      setPatientName(data.patientName)

      // Map existing answers
      const existingAnswers = {}
      data.items.forEach((item) => {
        existingAnswers[item.checklistItemId] = {
          yesNoNa: item.yesNoNa || item.responseValue || '',
          responseValue: item.responseValue || item.yesNoNa || '',
          remarks: item.remarks || '',
          responsibility: item.responsibility || '',
          status: item.status || 'OPEN',
        }
      })

      // Merge with all checklist items
      const allAnswers = {}
      checklist.forEach((it) => {
        if (existingAnswers[it._id]) {
          allAnswers[it._id] = existingAnswers[it._id]
        } else {
          allAnswers[it._id] = {
            yesNoNa: it.isMandatory ? 'YES' : 'NA',
            responseValue: it.isMandatory ? 'YES' : '',
            remarks: '',
            responsibility: '',
            status: 'OPEN',
          }
        }
      })
      setAnswers(allAnswers)
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to load submission'
      setMessage(errorMsg)
      if (err.response?.status === 404) {
        setMessage('No submission found for this UHID and department.')
      } else if (err.response?.status === 403) {
        setMessage('You can only edit your own submissions. Only admins can edit submissions from other users.')
      }
    } finally {
      setLoading(false)
    }
  }

  const updateAnswer = (id, field, value) => {
    setAnswers((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!patientName.trim()) {
      setMessage('Please enter Patient Name')
      return
    }

    setSubmitting(true)
    setMessage('')
    try {
      const payload = {
        departmentId: selectedDeptId,
        uhid: uhid.trim(),
        patientName: patientName.trim(),
        items: items.map((it) => ({
          checklistItemId: it._id,
          ...answers[it._id],
        })),
      }
      
      await apiClient.put('/audits', payload)
      setMessage('Audit updated successfully!')
      
      // Call success callback and close after a short delay
      setTimeout(() => {
        if (onSuccess) onSuccess()
        onClose()
      }, 1500)
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to update audit'
      setMessage(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  // Group items by section
  const itemsBySection = items.reduce((acc, item) => {
    const section = item.section || 'Other'
    if (!acc[section]) acc[section] = []
    acc[section].push(item)
    return acc
  }, {})

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Edit Audit Record</h2>
            <p className="text-sm text-red-100">UHID: {uhid}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-red-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-slate-500">Loading submission data...</div>
            </div>
          ) : (
            <>
              {message && (
                <div
                  className={`mb-4 px-3 py-2 rounded text-sm ${
                    message.includes('successfully')
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {message}
                </div>
              )}

              {/* Department Selector */}
              {availableDepartments.length > 1 && (
                <div className="mb-4 p-3 bg-slate-50 rounded border border-slate-200">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Department:
                  </label>
                  <select
                    value={selectedDeptId?.toString() || selectedDeptId}
                    onChange={(e) => {
                      setSelectedDeptId(e.target.value)
                      setAnswers({}) // Clear answers when switching departments
                    }}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    {availableDepartments.map((dept) => (
                      <option key={dept._id} value={dept._id?.toString() || dept._id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {availableDepartments.length === 0 && !loading && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  No submissions found for this UHID. Please submit a new form first.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Patient Information */}
                <div className="bg-slate-50 rounded-lg border-2 border-red-500 p-3">
                  <h3 className="text-sm font-bold text-slate-800 mb-2">
                    Patient Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        UHID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={uhid}
                        disabled
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Patient Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Checklist Sections */}
                {Object.keys(itemsBySection).length === 0 ? (
                  <div className="bg-white rounded-lg border border-slate-200 p-4 text-center text-sm text-slate-500">
                    No checklist items available for this department.
                  </div>
                ) : (
                  Object.keys(itemsBySection)
                    .sort()
                    .map((sectionName) => (
                      <div key={sectionName} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <div className="bg-red-600 text-white px-3 py-2">
                          <h3 className="font-semibold text-sm">{sectionName}</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="text-left px-2 py-2 font-semibold text-slate-700 w-[30%]">Checklist Item</th>
                                <th className="text-center px-2 py-2 font-semibold text-slate-700 w-[15%]">Response</th>
                                <th className="text-left px-2 py-2 font-semibold text-slate-700 w-[20%]">Remarks</th>
                                <th className="text-left px-2 py-2 font-semibold text-slate-700 w-[18%]">Responsibility</th>
                                <th className="text-center px-2 py-2 font-semibold text-slate-700 w-[17%]">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {itemsBySection[sectionName]
                                .sort((a, b) => a.order - b.order)
                                .map((it) => {
                                  const responseType = it.responseType || 'YES_NO_NA'
                                  const currentValue = answers[it._id]?.responseValue || answers[it._id]?.yesNoNa || ''
                                  
                                  return (
                                    <tr key={it._id} className="hover:bg-slate-50">
                                      <td className="px-2 py-2 align-top">
                                        <div className="font-medium text-slate-800">{it.label}</div>
                                      </td>
                                      <td className="px-2 py-2 align-top">
                                        {(() => {
                                          switch (responseType) {
                                            case 'YES_NO':
                                              return (
                                                <div className="flex flex-col gap-1">
                                                  {['YES', 'NO'].map((opt) => (
                                                    <label key={opt} className="flex items-center gap-1 cursor-pointer">
                                                      <input
                                                        type="radio"
                                                        name={`resp_${it._id}`}
                                                        value={opt}
                                                        checked={currentValue === opt}
                                                        onChange={(e) => {
                                                          updateAnswer(it._id, 'responseValue', e.target.value)
                                                          updateAnswer(it._id, 'yesNoNa', e.target.value)
                                                        }}
                                                        className="w-3 h-3 text-red-600"
                                                      />
                                                      <span className="text-[10px]">{opt}</span>
                                                    </label>
                                                  ))}
                                                </div>
                                              )
                                            case 'YES_NO_NA':
                                              return (
                                                <div className="flex flex-col gap-1">
                                                  {['YES', 'NO', 'NA'].map((opt) => (
                                                    <label key={opt} className="flex items-center gap-1 cursor-pointer">
                                                      <input
                                                        type="radio"
                                                        name={`resp_${it._id}`}
                                                        value={opt}
                                                        checked={currentValue === opt}
                                                        onChange={(e) => {
                                                          updateAnswer(it._id, 'responseValue', e.target.value)
                                                          updateAnswer(it._id, 'yesNoNa', e.target.value)
                                                        }}
                                                        className="w-3 h-3 text-red-600"
                                                      />
                                                      <span className="text-[10px]">{opt}</span>
                                                    </label>
                                                  ))}
                                                </div>
                                              )
                                            default:
                                              return (
                                                <div className="flex flex-col gap-1">
                                                  {['YES', 'NO', 'NA'].map((opt) => (
                                                    <label key={opt} className="flex items-center gap-1 cursor-pointer">
                                                      <input
                                                        type="radio"
                                                        name={`resp_${it._id}`}
                                                        value={opt}
                                                        checked={currentValue === opt}
                                                        onChange={(e) => {
                                                          updateAnswer(it._id, 'responseValue', e.target.value)
                                                          updateAnswer(it._id, 'yesNoNa', e.target.value)
                                                        }}
                                                        className="w-3 h-3 text-red-600"
                                                      />
                                                      <span className="text-[10px]">{opt}</span>
                                                    </label>
                                                  ))}
                                                </div>
                                              )
                                          }
                                        })()}
                                      </td>
                                      <td className="px-2 py-2 align-top">
                                        <input
                                          type="text"
                                          className="border border-slate-300 rounded w-full px-1.5 py-1 text-[10px] focus:ring-1 focus:ring-red-500"
                                          value={answers[it._id]?.remarks || ''}
                                          onChange={(e) => updateAnswer(it._id, 'remarks', e.target.value)}
                                          placeholder="Remarks"
                                        />
                                      </td>
                                      <td className="px-2 py-2 align-top">
                                        <input
                                          type="text"
                                          className="border border-slate-300 rounded w-full px-1.5 py-1 text-[10px] focus:ring-1 focus:ring-red-500"
                                          value={answers[it._id]?.responsibility || ''}
                                          onChange={(e) => updateAnswer(it._id, 'responsibility', e.target.value)}
                                          placeholder="Responsible"
                                        />
                                      </td>
                                      <td className="px-2 py-2 align-top">
                                        <select
                                          className="border border-slate-300 rounded w-full px-1.5 py-1 text-[10px] focus:ring-1 focus:ring-red-500"
                                          value={answers[it._id]?.status || 'OPEN'}
                                          onChange={(e) => updateAnswer(it._id, 'status', e.target.value)}
                                        >
                                          {STATUS_OPTIONS.map((s) => (
                                            <option key={s} value={s}>
                                              {s.replace('_', ' ')}
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                    </tr>
                                  )
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                )}

                {/* Submit Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={onClose}
                    className="bg-slate-600 hover:bg-slate-700 text-white font-semibold px-6 py-2 rounded text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Updating...' : 'Update Audit'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

