import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'CLOSED']

export function Form() {
  const { formTemplateId } = useParams()
  const { user } = useAuth()
  const [formTemplate, setFormTemplate] = useState(null)
  const [department, setDepartment] = useState(null)
  const [items, setItems] = useState([])
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [uhid, setUhid] = useState('')
  const [patientName, setPatientName] = useState('')
  const [checkingUHID, setCheckingUHID] = useState(false)
  const [recentSubmissions, setRecentSubmissions] = useState([])
  const [showRecentSubmissions, setShowRecentSubmissions] = useState(false)
  const [loadingRecent, setLoadingRecent] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [submittedUHID, setSubmittedUHID] = useState('')
  const [submittedPatientName, setSubmittedPatientName] = useState('')

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
      if (!formTemplateId) {
        setLoading(false)
        return
      }

      setLoading(true)
      setLoadError(null)
      setMessage('')

      try {
        console.log('Loading form template:', formTemplateId)
        
        // Load form template first
        const form = await apiClient.get(`/form-templates/${formTemplateId}`)
        console.log('Form template loaded:', form)
        setFormTemplate(form)

        // Get user's department - handle both object and string formats
        let userDeptId = null
        if (user?.department) {
          userDeptId = typeof user.department === 'object' 
            ? (user.department.id || user.department._id) 
            : user.department
          console.log('User department ID:', userDeptId)
        }

        // For admin users or if no department, try to get department from form
        if (!userDeptId && user?.role === 'admin' && form.departments && form.departments.length > 0) {
          // Admin can use first department from form
          userDeptId = typeof form.departments[0] === 'object' 
            ? (form.departments[0]._id || form.departments[0].id)
            : form.departments[0]
          console.log('Admin using form department:', userDeptId)
        }

        if (!userDeptId && user?.role === 'user') {
          setLoadError('No department assigned. Please contact your administrator.')
          setLoading(false)
          return
        }

        // Get departments list
        const depts = await apiClient.get('/departments')
        const userDept = userDeptId 
          ? depts.find((d) => {
              const dId = d._id?.toString() || d._id
              const uId = userDeptId?.toString() || userDeptId
              return dId === uId
            }) || null
          : null
        setDepartment(userDept)
        console.log('User department found:', userDept)

        // Load checklist items for this form template
        if (userDeptId) {
          try {
            console.log(`[DEBUG] Loading checklist items for department: ${userDeptId}, formTemplate: ${formTemplateId}`)
            const checklist = await apiClient.get(
              `/checklists/department/${userDeptId}?formTemplateId=${formTemplateId}`
            )
            console.log('[DEBUG] Checklist items response:', checklist)
            console.log('[DEBUG] Checklist items loaded:', checklist?.length || 0)
            
            if (!checklist || !Array.isArray(checklist)) {
              console.warn('[DEBUG] Invalid checklist response:', checklist)
              setItems([])
              setAnswers({})
              setMessage('Warning: Invalid response from server. Please check backend logs.')
              return
            }
            
            setItems(checklist || [])

            // Initialize answers - all empty, no defaults
            const init = {}
            if (checklist && Array.isArray(checklist) && checklist.length > 0) {
              checklist.forEach((it) => {
                init[it._id] = {
                  yesNoNa: '',
                  responseValue: '',
                  remarks: '',
                  responsibility: '',
                  status: '',
                }
              })
            } else {
              // No items found - check if form is assigned to department
              console.warn('[DEBUG] No checklist items found. This could mean:')
              console.warn('[DEBUG] 1. Form template is not assigned to this department')
              console.warn('[DEBUG] 2. No items have been created for this form')
              console.warn('[DEBUG] 3. All items are inactive')
              setMessage('Warning: No checklist items found. The form may not be assigned to your department, or no items have been created yet.')
            }
            setAnswers(init)
          } catch (checklistErr) {
            console.error('[DEBUG] Error loading checklist items:', checklistErr)
            console.error('[DEBUG] Error details:', {
              message: checklistErr.message,
              response: checklistErr.response?.data,
              status: checklistErr.response?.status,
              statusText: checklistErr.response?.statusText
            })
            // Still show form even if items fail to load
            setItems([])
            setAnswers({})
            const errorMsg = checklistErr.response?.data?.message || checklistErr.message || 'Unknown error'
            setMessage(`Warning: Could not load checklist items: ${errorMsg}. Please check if the form is assigned to your department.`)
          }
        } else {
          // No department, but still show form (admin case)
          setItems([])
          setAnswers({})
        }
        
        setLoading(false)
      } catch (err) {
        console.error('[ERROR] Error loading form:', err)
        console.error('[ERROR] Error response:', err.response)
        console.error('[ERROR] Error status:', err.response?.status)
        console.error('[ERROR] Error data:', err.response?.data)
        
        let errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Error loading form'
        
        // Handle HTML error responses (backend not running or route not found)
        if (typeof errorMsg === 'string' && errorMsg.includes('<!DOCTYPE html>')) {
          errorMsg = 'Backend server error. Please ensure the backend server is running and restart it if needed.'
        } else if (err.response?.status === 404) {
          errorMsg = 'Form template not found. The form may have been deleted or the ID is invalid.'
          setFormTemplate(null)
        } else if (err.response?.status === 401) {
          errorMsg = 'Authentication failed. Please log in again.'
        } else if (err.response?.status === 403) {
          errorMsg = 'You do not have permission to access this form.'
        } else if (err.response?.status === 500) {
          errorMsg = `Server error: ${errorMsg}. Please check the backend console for details.`
        }
        
        setLoadError(`Error loading form: ${errorMsg}. Please try again.`)
        setLoading(false)
      }
    })()
  }, [formTemplateId, user])

  // Load recent submissions
  const loadRecentSubmissions = async () => {
    if (!formTemplateId) return
    
    // Get user department ID
    let userDeptId = null
    if (user?.department) {
      userDeptId = typeof user.department === 'object' 
        ? (user.department.id || user.department._id) 
        : user.department
    }
    
    if (!userDeptId) return
    
    setLoadingRecent(true)
    try {
      const data = await apiClient.get(
        `/audits/recent?departmentId=${userDeptId}&formTemplateId=${formTemplateId}&limit=10`
      )
      setRecentSubmissions(data)
    } catch (err) {
      console.error('Error loading recent submissions:', err)
    } finally {
      setLoadingRecent(false)
    }
  }

  // Reset form to new mode
  const resetToNewForm = () => {
    setUhid('')
    setPatientName('')
    setMessage('')
    const init = {}
    items.forEach((it) => {
      init[it._id] = {
        yesNoNa: '',
        responseValue: '',
        remarks: '',
        responsibility: '',
        status: '',
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

    if (!formTemplateId) {
      setMessage('Missing form information. Please refresh the page.')
      return
    }

    // Get user department ID
    let userDeptId = null
    if (user?.department) {
      userDeptId = typeof user.department === 'object' 
        ? (user.department.id || user.department._id) 
        : user.department
    }
    
    if (!userDeptId && user?.role === 'user') {
      setMessage('No department assigned. Please contact your administrator.')
      return
    }

    // Validate that remarks are provided when NO is selected
    for (const it of items) {
      const answer = answers[it._id]
      if (answer?.responseValue === 'NO' && (!answer?.remarks || !answer.remarks.trim())) {
        setMessage(`Remarks are required when "NO" is selected for: ${it.label}`)
        setSubmitting(false)
        return
      }
    }

    setSubmitting(true)
    setMessage('')
    try {
      const payload = {
        departmentId: userDeptId,
        formTemplateId: formTemplateId,
        uhid: uhid.trim(),
        patientName: patientName.trim(),
        items: items.map((it) => ({
          checklistItemId: it._id,
          ...answers[it._id],
        })),
      }
      
      // Create new submission
      await apiClient.post('/audits', payload)
      // Show success popup
      setSubmittedUHID(uhid.trim())
      setSubmittedPatientName(patientName.trim())
      setShowSuccessModal(true)
      // Reset form
      resetToNewForm()
      
      // Reload recent submissions
      await loadRecentSubmissions()
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to submit form'
      if (errorMsg.includes('UHID already exists') || errorMsg.includes('duplicate')) {
        setMessage('This UHID already exists in the system. Please verify the UHID or contact admin.')
      } else {
        setMessage(errorMsg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 text-center">
          <div className="text-slate-600">Loading form...</div>
        </div>
      </div>
    )
  }

  // Show error state
  if (loadError) {
    return (
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-4 text-center">
          <div className="text-blue-600 font-semibold">{loadError}</div>
        </div>
      </div>
    )
  }

  // Show not found state
  if (!formTemplate) {
    return (
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 text-center">
          <div className="text-blue-600">Form not found. Please select a valid form from the menu.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-3">
      {message && (
        <div
          className={`px-3 py-2 rounded text-xs ${
            message.includes('successfully')
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-blue-50 border border-blue-200 text-blue-700'
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Compact Patient Information */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-blue-500 p-3">
          <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1">
            <span className="text-blue-500">*</span>
            Patient Information (Mandatory)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-slate-700 mb-1">
                UHID <span className="text-blue-500">*</span>
                {checkingUHID && <span className="ml-1 text-[10px] text-slate-400">(Checking...)</span>}
              </label>
              <input
                type="text"
                value={uhid}
                onChange={(e) => setUhid(e.target.value.toUpperCase())}
                placeholder="Enter UHID"
                disabled={checkingUHID}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-slate-700 mb-1">
                Patient Name <span className="text-blue-500">*</span>
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter Patient Name"
                required
              />
            </div>
          </div>
        </div>

        {/* Checklist Sections - Compact Table Style */}
        {Object.keys(itemsBySection).length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 text-center text-xs text-slate-500">
            No checklist items available for this form.
          </div>
        ) : (
          Object.keys(itemsBySection)
            .sort()
            .map((sectionName) => (
              <div key={sectionName} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                {/* Compact Section Header */}
                <div className="bg-blue-600 text-white px-3 py-1.5">
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
                                    <span className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-medium">
                                      Mandatory
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-2 py-2 align-top">
                                {/* Only YES/NO response type */}
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
                                          // Clear remarks if YES is selected
                                          if (e.target.value === 'YES') {
                                            updateAnswer(it._id, 'remarks', '')
                                          }
                                        }}
                                        className="w-3 h-3 text-blue-600 border-slate-300 focus:ring-blue-500"
                                      />
                                      <span className="text-[10px]">{opt}</span>
                                    </label>
                                  ))}
                                </div>
                              </td>
                              <td className="px-2 py-2 align-top">
                                {/* Show remarks only when NO is selected, and make it required */}
                                {currentValue === 'NO' ? (
                                  <input
                                    type="text"
                                    className="border border-blue-300 rounded w-full px-1.5 py-1 text-[10px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-blue-50"
                                    value={answers[it._id]?.remarks || ''}
                                    onChange={(e) => updateAnswer(it._id, 'remarks', e.target.value)}
                                    placeholder="Remarks required*"
                                    required
                                  />
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">N/A</span>
                                )}
                              </td>
                              <td className="px-2 py-2 align-top">
                                <input
                                  type="text"
                                  className="border border-slate-300 rounded w-full px-1.5 py-1 text-[10px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  value={answers[it._id]?.responsibility || ''}
                                  onChange={(e) => updateAnswer(it._id, 'responsibility', e.target.value)}
                                  placeholder="Responsible"
                                />
                              </td>
                              <td className="px-2 py-2 align-top">
                                <select
                                  className="border border-slate-300 rounded w-full px-1.5 py-1 text-[10px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  value={answers[it._id]?.status || ''}
                                  onChange={(e) => updateAnswer(it._id, 'status', e.target.value)}
                                >
                                  <option value="">Select Status</option>
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
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded text-xs sm:text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow"
            >
              {submitting ? 'Submitting...' : 'Submit Form'}
            </button>
          </div>
        )}
      </form>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Form Submitted Successfully!</h3>
              <div className="text-sm text-slate-600 mb-4 space-y-1">
                <p><span className="font-semibold">UHID:</span> {submittedUHID}</p>
                <p><span className="font-semibold">Patient Name:</span> {submittedPatientName}</p>
              </div>
              <button
                onClick={() => {
                  setShowSuccessModal(false)
                  setSubmittedUHID('')
                  setSubmittedPatientName('')
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

