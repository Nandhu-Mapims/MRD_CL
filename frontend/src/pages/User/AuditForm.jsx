import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'CLOSED']

export function AuditForm() {
  const { departmentId } = useParams()
  const { user } = useAuth()
  const [department, setDepartment] = useState(null)
  const [items, setItems] = useState([])
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [uhid, setUhid] = useState('')
  const [patientName, setPatientName] = useState('')
  const [checkingUHID, setCheckingUHID] = useState(false)

  // Auto-fill patient name when UHID is entered (if patient exists)
  useEffect(() => {
    const checkPatient = async () => {
      if (!uhid.trim() || uhid.trim().length < 3) {
        return
      }

      setCheckingUHID(true)
      try {
        const normalizedUHID = uhid.trim().toUpperCase()
        const patient = await apiClient.get(`/patients/uhid/${normalizedUHID}`)
        if (patient && patient.patientName) {
          setPatientName(patient.patientName)
        }
      } catch (err) {
        // Patient not found - that's okay, user will enter new patient
        if (err.response?.status !== 404) {
          console.error('Error checking patient:', err)
        }
      } finally {
        setCheckingUHID(false)
      }
    }

    // Debounce the API call
    const timeoutId = setTimeout(checkPatient, 500)
    return () => clearTimeout(timeoutId)
  }, [uhid])

  useEffect(() => {
    ;(async () => {
      const [depts, checklist] = await Promise.all([
        apiClient.get('/departments'),
        apiClient.get(`/checklists/department/${departmentId}`),
      ])
      setDepartment(depts.find((d) => d._id === departmentId) || null)
      setItems(checklist)
      const init = {}
      checklist.forEach((it) => {
        init[it._id] = {
          yesNoNa: it.isMandatory ? 'YES' : 'NA', // Legacy
          responseValue: it.isMandatory ? 'YES' : '', // New field
          remarks: '',
          responsibility: '',
          status: 'OPEN',
        }
      })
      setAnswers(init)
    })()
  }, [departmentId])

  // Group items by section
  const itemsBySection = items.reduce((acc, item) => {
    const section = item.section || 'Other'
    if (!acc[section]) acc[section] = []
    acc[section].push(item)
    return acc
  }, {})

  const updateAnswer = (id, field, value) => {
    setAnswers((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate mandatory fields
    if (!uhid.trim()) {
      setMessage('Please enter UHID')
      return
    }
    if (!patientName.trim()) {
      setMessage('Please enter Patient Name')
      return
    }

    setSubmitting(true)
    setMessage('')
    try {
      const payload = {
        departmentId,
        uhid: uhid.trim(),
        patientName: patientName.trim(),
        items: items.map((it) => ({
          checklistItemId: it._id,
          ...answers[it._id],
        })),
      }
      await apiClient.post('/audits', payload)
      setMessage('Audit submitted successfully!')
      // Reset form
      setUhid('')
      setPatientName('')
      const init = {}
      items.forEach((it) => {
        init[it._id] = {
          yesNoNa: it.isMandatory ? 'YES' : 'NA', // Legacy
          responseValue: it.isMandatory ? 'YES' : '', // New field
          remarks: '',
          responsibility: '',
          status: 'OPEN',
        }
      })
      setAnswers(init)
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to submit audit'
      if (errorMsg.includes('UHID already exists') || errorMsg.includes('duplicate')) {
        setMessage('This UHID already exists in the system. Please verify the UHID or contact admin.')
      } else {
        setMessage(errorMsg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-800">
            Audit Form {department ? `- ${department.name}` : ''}
          </h2>
          <p className="text-[10px] sm:text-xs text-slate-500">
            Complete all checklist items for your department.
          </p>
        </div>
        {user && (
          <div className="text-[10px] sm:text-xs text-slate-600">
            Logged in as <span className="font-medium">{user.name}</span>
          </div>
        )}
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-lg ${
            message.includes('successfully')
              ? 'bg-red-50 border border-emerald-200 text-red-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
        {/* Patient Information Section - Mandatory */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 border-2 border-red-500">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
            <span className="text-red-500">*</span>
            Patient Information (Mandatory)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">
                UHID <span className="text-red-500">*</span>
                {checkingUHID && (
                  <span className="ml-2 text-xs text-slate-500">(Checking...)</span>
                )}
              </label>
              <input
                type="text"
                value={uhid}
                onChange={(e) => setUhid(e.target.value.toUpperCase())}
                placeholder="Enter UHID (e.g., UHID12345)"
                disabled={checkingUHID}
                className="w-full border-2 border-slate-300 rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                required
              />
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
                UHID must be unique. Patient name will auto-fill if patient exists.
              </p>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">
                Patient Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full border-2 border-slate-300 rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter Patient Name"
                required
              />
            </div>
          </div>
        </div>
        {Object.keys(itemsBySection).length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center text-slate-500 text-sm sm:text-base">
            No checklist items available for this department.
          </div>
        ) : (
          Object.keys(itemsBySection)
            .sort()
            .map((sectionName) => (
              <div key={sectionName} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Section Header */}
                <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-500 text-white px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 shadow-md">
                  <h3 className="font-semibold text-sm sm:text-base md:text-lg">{sectionName}</h3>
                </div>

                {/* Section Items */}
                <div className="divide-y divide-slate-200">
                  {itemsBySection[sectionName]
                    .sort((a, b) => a.order - b.order)
                    .map((it) => (
                      <div
                        key={it._id}
                        className="p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 items-start hover:bg-slate-50 transition-colors"
                      >
                        <div className="lg:col-span-2">
                          <div className="font-medium text-xs sm:text-sm text-slate-800">{it.label}</div>
                          <div className="text-[10px] sm:text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-1 sm:gap-2">
                            <span>
                              Scope:{' '}
                              {it.departmentScope === 'ALL'
                                ? 'All departments'
                                : it.department?.name || 'Department specific'}
                            </span>
                            {it.isMandatory && (
                              <span className="px-1.5 sm:px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] sm:text-xs">
                                Mandatory
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] sm:text-xs font-medium text-slate-700 mb-1.5 sm:mb-2">
                            Response
                          </div>
                          {(() => {
                            const responseType = it.responseType || 'YES_NO_NA'
                            const currentValue = answers[it._id]?.responseValue || answers[it._id]?.yesNoNa || ''
                            
                            switch (responseType) {
                              case 'YES_NO':
                                return (
                                  <div className="flex flex-wrap gap-2 sm:gap-3">
                                    {['YES', 'NO'].map((opt) => (
                                      <label key={opt} className="flex items-center gap-1 cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`resp_${it._id}`}
                                          value={opt}
                                          checked={currentValue === opt}
                                          onChange={(e) => {
                                            updateAnswer(it._id, 'responseValue', e.target.value)
                                            updateAnswer(it._id, 'yesNoNa', e.target.value) // Legacy
                                          }}
                                          className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 border-slate-300 focus:ring-red-500"
                                        />
                                        <span className="text-[10px] sm:text-xs md:text-sm text-slate-700">{opt}</span>
                                      </label>
                                    ))}
                                  </div>
                                )
                              case 'YES_NO_NA':
                                return (
                                  <div className="flex flex-wrap gap-2 sm:gap-3">
                                    {['YES', 'NO', 'NA'].map((opt) => (
                                      <label key={opt} className="flex items-center gap-1 cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`resp_${it._id}`}
                                          value={opt}
                                          checked={currentValue === opt}
                                          onChange={(e) => {
                                            updateAnswer(it._id, 'responseValue', e.target.value)
                                            updateAnswer(it._id, 'yesNoNa', e.target.value) // Legacy
                                          }}
                                          className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 border-slate-300 focus:ring-red-500"
                                        />
                                        <span className="text-[10px] sm:text-xs md:text-sm text-slate-700">{opt}</span>
                                      </label>
                                    ))}
                                  </div>
                                )
                              case 'CHECKBOX':
                                return (
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={currentValue === 'YES' || currentValue === 'true' || currentValue === true}
                                      onChange={(e) => {
                                        const value = e.target.checked ? 'YES' : 'NO'
                                        updateAnswer(it._id, 'responseValue', value)
                                        updateAnswer(it._id, 'yesNoNa', value) // Legacy
                                      }}
                                      className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 border-slate-300 rounded focus:ring-red-500"
                                    />
                                    <span className="text-[10px] sm:text-xs md:text-sm text-slate-700">Checked</span>
                                  </label>
                                )
                              case 'TEXT':
                                return (
                                  <input
                                    type="text"
                                    className="border border-slate-300 rounded-lg w-full px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    value={currentValue}
                                    onChange={(e) => updateAnswer(it._id, 'responseValue', e.target.value)}
                                    placeholder="Enter text"
                                  />
                                )
                              case 'NUMBER':
                                return (
                                  <input
                                    type="number"
                                    className="border border-slate-300 rounded-lg w-full px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    value={currentValue}
                                    onChange={(e) => updateAnswer(it._id, 'responseValue', e.target.value)}
                                    placeholder="Enter number"
                                  />
                                )
                              case 'DATE':
                                return (
                                  <input
                                    type="date"
                                    className="border border-slate-300 rounded-lg w-full px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    value={currentValue}
                                    onChange={(e) => updateAnswer(it._id, 'responseValue', e.target.value)}
                                  />
                                )
                              case 'TIME':
                                return (
                                  <input
                                    type="time"
                                    className="border border-slate-300 rounded-lg w-full px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    value={currentValue}
                                    onChange={(e) => updateAnswer(it._id, 'responseValue', e.target.value)}
                                  />
                                )
                              case 'DROPDOWN':
                                const options = it.responseOptions ? it.responseOptions.split(',').map(o => o.trim()) : []
                                return (
                                  <select
                                    className="border border-slate-300 rounded-lg w-full px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    value={currentValue}
                                    onChange={(e) => updateAnswer(it._id, 'responseValue', e.target.value)}
                                  >
                                    <option value="">Select...</option>
                                    {options.map((opt, idx) => (
                                      <option key={idx} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                )
                              default:
                                return (
                                  <div className="flex flex-wrap gap-2 sm:gap-3">
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
                                          className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 border-slate-300 focus:ring-red-500"
                                        />
                                        <span className="text-[10px] sm:text-xs md:text-sm text-slate-700">{opt}</span>
                                      </label>
                                    ))}
                                  </div>
                                )
                            }
                          })()}
                        </div>
                        <div>
                          <div className="text-[10px] sm:text-xs font-medium text-slate-700 mb-1.5 sm:mb-2">Remarks</div>
                          <input
                            type="text"
                            className="border border-slate-300 rounded-lg w-full px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            value={answers[it._id]?.remarks || ''}
                            onChange={(e) => updateAnswer(it._id, 'remarks', e.target.value)}
                            placeholder="Remarks if NA"
                          />
                        </div>
                        <div className="space-y-2 sm:space-y-3">
                          <div>
                            <div className="text-[10px] sm:text-xs font-medium text-slate-700 mb-1.5 sm:mb-2">Responsibility</div>
                            <input
                              type="text"
                              className="border border-slate-300 rounded-lg w-full px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              value={answers[it._id]?.responsibility || ''}
                              onChange={(e) => updateAnswer(it._id, 'responsibility', e.target.value)}
                              placeholder="Responsible"
                            />
                          </div>
                          <div>
                            <div className="text-[10px] sm:text-xs font-medium text-slate-700 mb-1.5 sm:mb-2">Status</div>
                            <select
                              className="border border-slate-300 rounded-lg w-full px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              value={answers[it._id]?.status || 'OPEN'}
                              onChange={(e) => updateAnswer(it._id, 'status', e.target.value)}
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {s.replace('_', ' ')}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))
        )}

        {/* Submit Button */}
        {Object.keys(itemsBySection).length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-700 hover:via-red-800 hover:to-red-900 text-white font-semibold px-6 sm:px-7 md:px-8 py-2 sm:py-2.5 md:py-3 rounded-lg shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-[1.02] text-xs sm:text-sm md:text-base w-full sm:w-auto"
            >
              {submitting ? 'Submitting...' : 'Submit Audit'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}


