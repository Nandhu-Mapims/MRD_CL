import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

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
  const [ipid, setIpid] = useState('')
  const [patientName, setPatientName] = useState('')
  const [ward, setWard] = useState('')
  const [unitNo, setUnitNo] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [submittedUHID, setSubmittedUHID] = useState('')
  const [submittedPatientName, setSubmittedPatientName] = useState('')
  const [duplicateExists, setDuplicateExists] = useState(false)
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)
  const [duplicateMessage, setDuplicateMessage] = useState('')

  // UHID is entered manually from OP card - no database lookup needed
  // Patient record will be created automatically when form is submitted

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


  // Check for duplicate submission when UHID and IPID are entered
  useEffect(() => {
    const checkDuplicate = async () => {
      // Only check if both UHID and IPID are provided and user has a department
      if (!uhid.trim() || !ipid.trim() || !user?.department || loading) {
        setDuplicateExists(false)
        setDuplicateMessage('')
        return
      }

      let userDeptId = null
      if (user?.department) {
        userDeptId = typeof user.department === 'object' 
          ? (user.department.id || user.department._id) 
          : user.department
      }

      if (!userDeptId) {
        return
      }

      setCheckingDuplicate(true)
      try {
        const response = await apiClient.get(
          `/audits/check-duplicate?uhid=${encodeURIComponent(uhid.trim().toUpperCase())}&ipid=${encodeURIComponent(ipid.trim().toUpperCase())}&departmentId=${encodeURIComponent(userDeptId)}`
        )
        
        if (response.exists) {
          setDuplicateExists(true)
          const submittedDate = response.submittedAt 
            ? new Date(response.submittedAt).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'previously'
          const submittedBy = response.submittedBy?.name || 'another user'
          setDuplicateMessage(`No Duplicate IPID: A checklist has already been submitted for this UHID (${uhid.trim().toUpperCase()}) and IPID (${ipid.trim().toUpperCase()}) by your department. Submitted by ${submittedBy} on ${submittedDate}. Only one submission is allowed per department for the same admission.`)
        } else {
          setDuplicateExists(false)
          setDuplicateMessage('')
        }
      } catch (err) {
        console.error('Error checking duplicate:', err)
        // Don't block form if check fails - let backend handle it on submit
        setDuplicateExists(false)
        setDuplicateMessage('')
      } finally {
        setCheckingDuplicate(false)
      }
    }

    // Debounce the check to avoid too many API calls
    const timeoutId = setTimeout(() => {
      checkDuplicate()
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId)
  }, [uhid, ipid, user, loading])

  // Reset form to new mode
  const resetToNewForm = () => {
    setUhid('')
    setIpid('')
    setPatientName('')
    setWard('')
    setUnitNo('')
    setMessage('')
    setDuplicateExists(false)
    setDuplicateMessage('')
    const init = {}
    items.forEach((it) => {
            init[it._id] = {
              yesNoNa: '',
              responseValue: '',
              remarks: '',
              responsibility: '',
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

    if (!ipid.trim()) {
      setMessage('Please enter IPID (In-Patient ID)')
      return
    }
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

    // Validate responses
    for (const it of items) {
      const answer = answers[it._id]
      const responseType = it.responseType || 'YES_NO'
      
      // Validate mandatory items
      if (it.isMandatory) {
        if (!answer?.responseValue || !answer.responseValue.trim()) {
          setMessage(`Response is required for mandatory item: ${it.label}`)
          setSubmitting(false)
          return
        }
      }
      
      // Validate that remarks are provided when NO is selected (for YES_NO type)
      if (responseType === 'YES_NO' && answer?.responseValue === 'NO' && (!answer?.remarks || !answer.remarks.trim())) {
        setMessage(`Remarks are required when "NO" is selected for: ${it.label}`)
        setSubmitting(false)
        return
      }
      
      // Validate TEXT type has content if mandatory
      if (responseType === 'TEXT' && it.isMandatory && (!answer?.responseValue || !answer.responseValue.trim())) {
        setMessage(`Text response is required for: ${it.label}`)
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
        ipid: ipid.trim(),
        patientName: patientName.trim(),
        ward: ward.trim(),
        unitNo: unitNo.trim(),
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
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to submit form'
      if (errorMsg.includes('No Duplicate IPID') || errorMsg.includes('already been submitted')) {
        setMessage('No Duplicate IPID: A checklist has already been submitted for this UHID, IPID, and Department combination. Only one submission is allowed per department for the same admission.')
      } else if (errorMsg.includes('UHID already exists') || errorMsg.includes('duplicate')) {
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
    <div className="max-w-7xl mx-auto space-y-4 px-4 py-4">
      {message && (
        <div
          className={`px-4 py-3 rounded-lg shadow-sm border-2 flex items-start gap-3 ${
            message.includes('successfully') || message.includes('Success')
              ? 'bg-green-50 border-green-300 text-green-800'
              : message.includes('Error') || message.includes('error') || message.includes('failed')
              ? 'bg-red-50 border-red-300 text-red-800'
              : 'bg-blue-50 border-blue-300 text-blue-800'
          }`}
        >
          {message.includes('successfully') || message.includes('Success') ? (
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : message.includes('Error') || message.includes('error') || message.includes('failed') ? (
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )}
          <span className="text-sm font-medium flex-1">{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Patient Information Section */}
        <div className="bg-white rounded-lg shadow-md border border-blue-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Patient Information <span className="text-red-300">*</span>
              <span className="text-xs font-normal text-blue-100 ml-2">(All fields are mandatory)</span>
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  UHID <span className="text-red-500">*</span>
                  <span className="ml-1 text-[10px] font-normal text-slate-500">(Enter from OP Card)</span>
                </label>
                <input
                  type="text"
                  value={uhid}
                  onChange={(e) => setUhid(e.target.value.toUpperCase())}
                  placeholder="Enter UHID from OP Card"
                  className={`w-full border-2 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                    duplicateExists ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                  }`}
                  required
                  disabled={duplicateExists}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  IPID <span className="text-red-500">*</span>
                  <span className="ml-1 text-[10px] font-normal text-slate-500">(In-Patient ID)</span>
                </label>
                <input
                  type="text"
                  value={ipid}
                  onChange={(e) => setIpid(e.target.value.toUpperCase())}
                  placeholder="Enter IPID from Admission Slip"
                  className={`w-full border-2 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                    duplicateExists ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                  }`}
                  required
                  disabled={duplicateExists}
                />
                {checkingDuplicate && (
                  <div className="text-xs text-blue-600 mt-1.5 flex items-center gap-2">
                    <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></span>
                    Checking for existing submission...
                  </div>
                )}
                {duplicateExists && duplicateMessage && (
                  <div className="mt-2 p-3 bg-red-50 border-2 border-red-300 rounded-md text-xs text-red-800">
                    <div className="font-bold mb-1 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Duplicate Submission Detected
                    </div>
                    <div className="leading-relaxed">{duplicateMessage}</div>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Patient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className={`w-full border-2 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                    duplicateExists ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                  }`}
                  placeholder="Enter Patient Name"
                  required
                  disabled={duplicateExists}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Ward <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  className={`w-full border-2 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                    duplicateExists ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                  }`}
                  placeholder="Enter Ward"
                  required
                  disabled={duplicateExists}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Unit No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={unitNo}
                  onChange={(e) => setUnitNo(e.target.value)}
                  className={`w-full border-2 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                    duplicateExists ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                  }`}
                  placeholder="Enter Unit No"
                  required
                  disabled={duplicateExists}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Checklist Sections */}
        {Object.keys(itemsBySection).length === 0 ? (
          <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 text-center">
            <div className="text-slate-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500 font-medium">No checklist items available for this form.</p>
          </div>
        ) : (
          Object.keys(itemsBySection)
            .sort()
            .map((sectionName) => (
              <div key={sectionName} className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
                {/* Section Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3">
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {sectionName}
                  </h3>
                </div>

                {/* Table Layout */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-100 border-b-2 border-slate-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-bold text-xs text-slate-700 uppercase tracking-wide w-[35%]">Checklist Item</th>
                        <th className="text-center px-4 py-3 font-bold text-xs text-slate-700 uppercase tracking-wide w-[15%]">Response</th>
                        <th className="text-left px-4 py-3 font-bold text-xs text-slate-700 uppercase tracking-wide w-[25%]">Remarks</th>
                        <th className="text-left px-4 py-3 font-bold text-xs text-slate-700 uppercase tracking-wide w-[25%]">Responsibility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itemsBySection[sectionName]
                        .sort((a, b) => a.order - b.order)
                        .map((it, idx) => {
                          const responseType = it.responseType || 'YES_NO'
                          const currentValue = answers[it._id]?.responseValue || answers[it._id]?.yesNoNa || ''
                          const isTextType = responseType === 'TEXT'
                          
                          return (
                            <tr key={it._id} className={`hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                              <td className="px-4 py-3 align-top">
                                <div className="font-semibold text-sm text-slate-800 mb-1">{it.label}</div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                    {it.departmentScope === 'ALL' ? 'All departments' : it.department?.name || 'Dept specific'}
                                  </span>
                                  {it.isMandatory && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-semibold">
                                      Mandatory
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 align-middle" colSpan={isTextType ? 3 : 1}>
                                {/* Handle different response types */}
                                {responseType === 'TEXT' ? (
                                  <textarea
                                    className="border-2 border-blue-300 rounded-md w-full px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50 resize-y min-h-[100px] transition-all"
                                    value={answers[it._id]?.responseValue || ''}
                                    onChange={(e) => {
                                      updateAnswer(it._id, 'responseValue', e.target.value)
                                      updateAnswer(it._id, 'yesNoNa', '')
                                    }}
                                    placeholder={it.isMandatory ? "Enter text about the patient (required)*" : "Enter text about the patient"}
                                    required={it.isMandatory}
                                    rows={4}
                                  />
                                ) : responseType === 'MULTI_SELECT' ? (
                                  <select
                                    className="border-2 border-slate-300 rounded-md w-full px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                                    value={currentValue}
                                    onChange={(e) => {
                                      updateAnswer(it._id, 'responseValue', e.target.value)
                                      updateAnswer(it._id, 'yesNoNa', e.target.value)
                                    }}
                                    required={it.isMandatory}
                                  >
                                    <option value="">Select an option</option>
                                    {it.responseOptions && it.responseOptions.split(',').map((opt, idx) => (
                                      <option key={idx} value={opt.trim()}>
                                        {opt.trim()}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div className="flex items-center justify-center gap-4">
                                    {['YES', 'NO'].map((opt) => (
                                      <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                          type="radio"
                                          name={`resp_${it._id}`}
                                          value={opt}
                                          checked={currentValue === opt}
                                          onChange={(e) => {
                                            updateAnswer(it._id, 'responseValue', e.target.value)
                                            updateAnswer(it._id, 'yesNoNa', e.target.value)
                                            if (e.target.value === 'YES') {
                                              updateAnswer(it._id, 'remarks', '')
                                            }
                                          }}
                                          className="w-4 h-4 text-blue-600 border-2 border-slate-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        />
                                        <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">{opt}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </td>
                              {!isTextType && (
                                <>
                                  <td className="px-4 py-3 align-top">
                                    {responseType === 'YES_NO' && currentValue === 'NO' ? (
                                      <input
                                        type="text"
                                        className="border-2 border-blue-300 rounded-md w-full px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50 transition-all"
                                        value={answers[it._id]?.remarks || ''}
                                        onChange={(e) => updateAnswer(it._id, 'remarks', e.target.value)}
                                        placeholder="Remarks required*"
                                        required
                                      />
                                    ) : (
                                      <span className="text-xs text-slate-400 italic">N/A</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <input
                                      type="text"
                                      className="border-2 border-slate-300 rounded-md w-full px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                      value={answers[it._id]?.responsibility || ''}
                                      onChange={(e) => updateAnswer(it._id, 'responsibility', e.target.value)}
                                      placeholder="Enter responsible person"
                                    />
                                  </td>
                                </>
                              )}
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
        )}

        {/* Submit Button */}
        {Object.keys(itemsBySection).length > 0 && (
          <div className="bg-white rounded-lg shadow-md border border-slate-200 p-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={resetToNewForm}
              className="px-6 py-2.5 border-2 border-slate-300 text-slate-700 font-semibold rounded-md hover:bg-slate-50 transition-all text-sm"
            >
              Reset Form
            </button>
            <button
              type="submit"
              disabled={submitting || duplicateExists || checkingDuplicate}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold px-8 py-2.5 rounded-md transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-sm flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  Submitting...
                </>
              ) : duplicateExists ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Duplicate - Cannot Submit
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Submit Form
                </>
              )}
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

