import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { EditAuditModal } from '../../components/EditAuditModal'

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
  const [isEditMode, setIsEditMode] = useState(false)
  const [recentSubmissions, setRecentSubmissions] = useState([])
  const [showRecentSubmissions, setShowRecentSubmissions] = useState(false)
  const [loadingRecent, setLoadingRecent] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedUhid, setSelectedUhid] = useState('')

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
          yesNoNa: it.isMandatory ? 'YES' : 'NA',
          responseValue: it.isMandatory ? 'YES' : '',
          remarks: '',
          responsibility: '',
          status: 'OPEN',
        }
      })
      setAnswers(init)
    })()
  }, [departmentId])

  // Load recent submissions
  const loadRecentSubmissions = async () => {
    setLoadingRecent(true)
    try {
      const data = await apiClient.get(`/audits/recent?departmentId=${departmentId}&limit=10`)
      setRecentSubmissions(data)
    } catch (err) {
      console.error('Error loading recent submissions:', err)
    } finally {
      setLoadingRecent(false)
    }
  }

  // Load submission for editing
  const loadSubmissionForEdit = async (editUhid) => {
    try {
      const data = await apiClient.get(`/audits/edit?uhid=${editUhid}&departmentId=${departmentId}`)
      
      // Set form data
      setUhid(data.uhid)
      setPatientName(data.patientName)
      setIsEditMode(true)
      setShowRecentSubmissions(false)

      // Wait for items to be loaded if not already
      if (items.length === 0) {
        const checklist = await apiClient.get(`/checklists/department/${departmentId}`)
        setItems(checklist)
        
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

        // Merge with all checklist items (in case new items were added)
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
      } else {
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

        // Merge with all checklist items (in case new items were added)
        const allAnswers = {}
        items.forEach((it) => {
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
      }
      setMessage('')
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to load submission for editing'
      setMessage(errorMsg)
      if (err.response?.status === 403) {
        setMessage('You can only edit your own submissions. Only admins can edit submissions from other users.')
      }
    }
  }

  // Reset form to new mode
  const resetToNewForm = () => {
    setIsEditMode(false)
    setUhid('')
    setPatientName('')
    setMessage('')
    const init = {}
    items.forEach((it) => {
      init[it._id] = {
        yesNoNa: it.isMandatory ? 'YES' : 'NA',
        responseValue: it.isMandatory ? 'YES' : '',
        remarks: '',
        responsibility: '',
        status: 'OPEN',
      }
    })
    setAnswers(init)
  }

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
      
      if (isEditMode) {
        // Update existing submission
        await apiClient.put('/audits', payload)
        setMessage('Audit updated successfully!')
      } else {
        // Create new submission
        await apiClient.post('/audits', payload)
        setMessage('Audit submitted successfully!')
      }
      
      // Reset form
      resetToNewForm()
      // Reload recent submissions
      await loadRecentSubmissions()
    } catch (err) {
      const errorMsg = err.response?.data?.message || (isEditMode ? 'Failed to update audit' : 'Failed to submit audit')
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
    <div className="max-w-7xl mx-auto space-y-3">
      {/* Compact Header */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800">
              {isEditMode ? 'Edit' : 'New'} Audit Form {department ? `- ${department.name}` : ''}
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
              {isEditMode ? 'Update the checklist items below' : 'Complete all checklist items for your department'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditMode && (
              <button
                type="button"
                onClick={() => {
                  setShowRecentSubmissions(!showRecentSubmissions)
                  if (!showRecentSubmissions && recentSubmissions.length === 0) {
                    loadRecentSubmissions()
                  }
                }}
                className="text-[10px] sm:text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition-all"
              >
                {showRecentSubmissions ? 'Hide Recent' : 'Edit Recent'}
              </button>
            )}
            {isEditMode && (
              <button
                type="button"
                onClick={resetToNewForm}
                className="text-[10px] sm:text-xs bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded transition-all"
              >
                New Form
              </button>
            )}
            {user && (
              <div className="text-[10px] sm:text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
                Logged in as <span className="font-semibold">{user.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Submissions Panel */}
      {showRecentSubmissions && !isEditMode && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
          <h3 className="text-xs font-bold text-slate-800 mb-2">Recent Submissions</h3>
          {loadingRecent ? (
            <div className="text-xs text-slate-500 py-2">Loading...</div>
          ) : recentSubmissions.length === 0 ? (
            <div className="text-xs text-slate-500 py-2">No recent submissions found.</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {recentSubmissions.map((sub, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200 hover:bg-slate-100"
                >
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUhid(sub.uhid)
                          setEditModalOpen(true)
                        }}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-semibold"
                      >
                        UHID: {sub.uhid}
                      </button>
                      {' - '}
                      {sub.patientName}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(sub.submittedAt).toLocaleString()} • {sub.itemCount} items
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadSubmissionForEdit(sub.uhid)}
                    className="text-[10px] bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-all"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {message && (
        <div
          className={`px-3 py-2 rounded text-xs ${
            message.includes('successfully')
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Compact Patient Information */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-red-500 p-3">
          <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1">
            <span className="text-red-500">*</span>
            Patient Information (Mandatory)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-slate-700 mb-1">
                UHID <span className="text-red-500">*</span>
                {checkingUHID && <span className="ml-1 text-[10px] text-slate-400">(Checking...)</span>}
              </label>
              <input
                type="text"
                value={uhid}
                onChange={(e) => setUhid(e.target.value.toUpperCase())}
                placeholder="Enter UHID"
                disabled={checkingUHID || isEditMode}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 disabled:bg-slate-100"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-slate-700 mb-1">
                Patient Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter Patient Name"
                required
              />
            </div>
          </div>
        </div>

        {/* Checklist Sections - Compact Table Style */}
        {Object.keys(itemsBySection).length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 text-center text-xs text-slate-500">
            No checklist items available for this department.
          </div>
        ) : (
          Object.keys(itemsBySection)
            .sort()
            .map((sectionName) => (
              <div key={sectionName} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                {/* Compact Section Header */}
                <div className="bg-red-600 text-white px-3 py-1.5">
                  <h3 className="font-semibold text-xs sm:text-sm">{sectionName}</h3>
                </div>

                {/* Compact Table Layout */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-2 py-1.5 font-semibold text-slate-700 w-[30%]">Checklist Item</th>
                        <th className="text-center px-2 py-1.5 font-semibold text-slate-700 w-[15%]">Response</th>
                        <th className="text-left px-2 py-1.5 font-semibold text-slate-700 w-[20%]">Remarks</th>
                        <th className="text-left px-2 py-1.5 font-semibold text-slate-700 w-[18%]">Responsibility</th>
                        <th className="text-center px-2 py-1.5 font-semibold text-slate-700 w-[17%]">Status</th>
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
                                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                  <span>
                                    {it.departmentScope === 'ALL' ? 'All departments' : it.department?.name || 'Dept specific'}
                                  </span>
                                  {it.isMandatory && (
                                    <span className="px-1 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-medium">
                                      Mandatory
                                    </span>
                                  )}
                                </div>
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
                                                className="w-3 h-3 text-red-600 border-slate-300 focus:ring-red-500"
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
                                                className="w-3 h-3 text-red-600 border-slate-300 focus:ring-red-500"
                                              />
                                              <span className="text-[10px]">{opt}</span>
                                            </label>
                                          ))}
                                        </div>
                                      )
                                    case 'CHECKBOX':
                                      return (
                                        <label className="flex items-center gap-1 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={currentValue === 'YES' || currentValue === 'true' || currentValue === true}
                                            onChange={(e) => {
                                              const value = e.target.checked ? 'YES' : 'NO'
                                              updateAnswer(it._id, 'responseValue', value)
                                              updateAnswer(it._id, 'yesNoNa', value)
                                            }}
                                            className="w-3.5 h-3.5 text-red-600 border-slate-300 rounded focus:ring-red-500"
                                          />
                                          <span className="text-[10px]">Checked</span>
                                        </label>
                                      )
                                    case 'TEXT':
                                      return (
                                        <input
                                          type="text"
                                          className="border border-slate-300 rounded w-full px-1.5 py-1 text-[10px] focus:ring-1 focus:ring-red-500 focus:border-red-500"
                                          value={currentValue}
                                          onChange={(e) => updateAnswer(it._id, 'responseValue', e.target.value)}
                                          placeholder="Text"
                                        />
                                      )
                                    case 'NUMBER':
                                      return (
                                        <input
                                          type="number"
                                          className="border border-slate-300 rounded w-full px-1.5 py-1 text-[10px] focus:ring-1 focus:ring-red-500 focus:border-red-500"
                                          value={currentValue}
                                          onChange={(e) => updateAnswer(it._id, 'responseValue', e.target.value)}
                                          placeholder="Number"
                                        />
                                      )
                                    case 'DATE':
                                      return (
                                        <input
                                          type="date"
                                          className="border border-slate-300 rounded w-full px-1.5 py-1 text-[10px] focus:ring-1 focus:ring-red-500 focus:border-red-500"
                                          value={currentValue}
                                          onChange={(e) => updateAnswer(it._id, 'responseValue', e.target.value)}
                                        />
                                      )
                                    case 'TIME':
                                      return (
                                        <input
                                          type="time"
                                          className="border border-slate-300 rounded w-full px-1.5 py-1 text-[10px] focus:ring-1 focus:ring-red-500 focus:border-red-500"
                                          value={currentValue}
                                          onChange={(e) => updateAnswer(it._id, 'responseValue', e.target.value)}
                                        />
                                      )
                                    case 'DROPDOWN':
                                      const options = it.responseOptions ? it.responseOptions.split(',').map(o => o.trim()) : []
                                      return (
                                        <select
                                          className="border border-slate-300 rounded w-full px-1.5 py-1 text-[10px] focus:ring-1 focus:ring-red-500 focus:border-red-500"
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
                                                className="w-3 h-3 text-red-600 border-slate-300 focus:ring-red-500"
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
                                  className="border border-slate-300 rounded w-full px-1.5 py-1 text-[10px] focus:ring-1 focus:ring-red-500 focus:border-red-500"
                                  value={answers[it._id]?.remarks || ''}
                                  onChange={(e) => updateAnswer(it._id, 'remarks', e.target.value)}
                                  placeholder="Remarks"
                                />
                              </td>
                              <td className="px-2 py-2 align-top">
                                <input
                                  type="text"
                                  className="border border-slate-300 rounded w-full px-1.5 py-1 text-[10px] focus:ring-1 focus:ring-red-500 focus:border-red-500"
                                  value={answers[it._id]?.responsibility || ''}
                                  onChange={(e) => updateAnswer(it._id, 'responsibility', e.target.value)}
                                  placeholder="Responsible"
                                />
                              </td>
                              <td className="px-2 py-2 align-top">
                                <select
                                  className="border border-slate-300 rounded w-full px-1.5 py-1 text-[10px] focus:ring-1 focus:ring-red-500 focus:border-red-500"
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

        {/* Compact Submit Button */}
        {Object.keys(itemsBySection).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 flex justify-end gap-2">
            {isEditMode && (
              <button
                type="button"
                onClick={resetToNewForm}
                className="bg-slate-600 hover:bg-slate-700 text-white font-semibold px-6 py-2 rounded text-xs sm:text-sm transition-all shadow-sm hover:shadow"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded text-xs sm:text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow"
            >
              {submitting ? (isEditMode ? 'Updating...' : 'Submitting...') : (isEditMode ? 'Update Audit' : 'Submit Audit')}
            </button>
          </div>
        )}
      </form>

      {/* Edit Modal */}
      <EditAuditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setSelectedUhid('')
        }}
        uhid={selectedUhid}
        departmentId={departmentId}
        onSuccess={() => {
          loadRecentSubmissions()
        }}
      />
    </div>
  )
}
