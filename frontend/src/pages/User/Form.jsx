import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

const DRAFT_KEY_PREFIX = 'form_draft_'

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
  const [unitChief, setUnitChief] = useState('')
  const [chiefDoctors, setChiefDoctors] = useState([])
  const [wards, setWards] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [submittedUHID, setSubmittedUHID] = useState('')
  const [submittedPatientName, setSubmittedPatientName] = useState('')
  const [duplicateExists, setDuplicateExists] = useState(false)
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)
  const [duplicateMessage, setDuplicateMessage] = useState('')
  const [showRestoreDraftModal, setShowRestoreDraftModal] = useState(false)
  const [draftToRestore, setDraftToRestore] = useState(null)
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState(null)

  // Draft helpers
  const getDraftKey = useCallback(() => {
    const uid = user?.id || user?._id || 'anon'
    return `${DRAFT_KEY_PREFIX}${formTemplateId}_${uid}`
  }, [formTemplateId, user])

  const saveDraft = useCallback(() => {
    const key = getDraftKey()
    const draft = {
      uhid,
      ipid,
      patientName,
      ward,
      unitNo,
      unitChief,
      answers,
      formTemplateId,
      formName: formTemplate?.name,
      savedAt: new Date().toISOString(),
    }
    try {
      localStorage.setItem(key, JSON.stringify(draft))
      setLastDraftSavedAt(new Date().toISOString())
    } catch (e) {
      console.warn('Failed to save draft:', e)
    }
  }, [getDraftKey, uhid, ipid, patientName, ward, unitNo, unitChief, answers, formTemplateId, formTemplate?.name])

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(getDraftKey())
    } catch (e) {
      console.warn('Failed to clear draft:', e)
    }
  }, [getDraftKey])

  const loadDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(getDraftKey())
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [getDraftKey])

  // Unsaved changes: any user input in patient info or checklist (every field included for draft)
  const hasUnsavedChanges =
    uhid.trim() ||
    ipid.trim() ||
    patientName.trim() ||
    ward.trim() ||
    unitNo.trim() ||
    unitChief.trim() ||
    Object.values(answers).some(
      (a) =>
        (a?.yesNoNa && String(a.yesNoNa).trim()) ||
        (a?.responseValue && String(a.responseValue).trim()) ||
        (a?.remarks && String(a.remarks).trim())
    )

  // Auto-save draft (debounced) for every form/field change so local draft is always up to date
  useEffect(() => {
    if (!formTemplateId || !getDraftKey() || showRestoreDraftModal) return
    if (!hasUnsavedChanges || items.length === 0) return

    const timeoutId = setTimeout(() => {
      saveDraft()
    }, 800)

    return () => clearTimeout(timeoutId)
  }, [formTemplateId, hasUnsavedChanges, items.length, showRestoreDraftModal, uhid, ipid, patientName, ward, unitNo, unitChief, answers, getDraftKey, saveDraft])

  // Clear "Draft saved" indicator after 2.5s
  useEffect(() => {
    if (!lastDraftSavedAt) return
    const t = setTimeout(() => setLastDraftSavedAt(null), 2500)
    return () => clearTimeout(t)
  }, [lastDraftSavedAt])

  // beforeunload for refresh/close (in-app navigation is not blocked; use data router + useBlocker if needed)
  useEffect(() => {
    const handler = (e) => {
      if (hasUnsavedChanges) e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsavedChanges])

  // Audit date/time are set on the backend only (auto-fetched on submit)
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
        
        // Load form template, chief doctors, and wards/units
        const [form, chiefs, wardsUnits] = await Promise.all([
          apiClient.get(`/form-templates/${formTemplateId}`),
          apiClient.get('/chief-doctors?isActive=true'),
          apiClient.get('/admissions/wards-and-units'),
        ])
        console.log('Form template loaded:', form)
        setFormTemplate(form)
        setChiefDoctors(chiefs || [])
        setWards(wardsUnits?.wards || [])
        setUnits(wardsUnits?.units || [])
        
        // Check if form is assigned to chief's department
        if (user?.role === 'chief' && form) {
          // Get user's department
          let userDeptId = null
          if (user?.department) {
            userDeptId = typeof user.department === 'object' 
              ? (user.department.id || user.department._id) 
              : user.department
          }
          
          // Check if form is assigned to chief's department
          if (userDeptId && form.departments) {
            const formDeptIds = form.departments.map(d => 
              typeof d === 'object' ? (d._id?.toString() || d.id?.toString()) : d.toString()
            )
            const userDeptIdStr = userDeptId.toString()
            
            if (!formDeptIds.includes(userDeptIdStr)) {
              // Form is not assigned to chief's department
              const depts = await apiClient.get('/departments')
              const userDept = depts.find(d => d._id?.toString() === userDeptIdStr)
              const formDepts = depts.filter(d => formDeptIds.includes(d._id?.toString()))
              
              setLoadError(
                `This form is not assigned to your department (${userDept?.name || 'Unknown'}). ` +
                `It is currently assigned to: ${formDepts.map(d => d.name).join(', ') || 'No departments'}. ` +
                `Please contact your administrator to assign this form to your department, or select a form from the navigation menu that is available to you.`
              )
              setLoading(false)
              return
            }
          }
        }

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

        if (!userDeptId && (user?.role === 'auditor' || user?.role === 'chief')) {
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
                }
              })
            } else {
              // No items found: form has no checklist items yet (admin adds them in Form Builder)
              if (user?.role === 'chief') {
                setLoadError(
                  `No checklist items for this form. Add items in Form Builder (Admin) or contact your administrator.`
                )
                setLoading(false)
                return
              } else {
                setMessage('No checklist items for this form. Add items in Form Builder (Admin) or contact your administrator.')
              }
            }
            setAnswers(init)

            // Auto-restore draft so every field value persists after refresh or navigating away
            try {
              const key = `${DRAFT_KEY_PREFIX}${formTemplateId}_${user?.id || user?._id || 'anon'}`
              const raw = localStorage.getItem(key)
              if (raw) {
                const draft = JSON.parse(raw)
                if (draft.formTemplateId === formTemplateId) {
                  setUhid(draft.uhid || '')
                  setIpid(draft.ipid || '')
                  setPatientName(draft.patientName || '')
                  setWard(draft.ward || '')
                  setUnitNo(draft.unitNo || '')
                  setUnitChief(draft.unitChief || '')
                  const merged = {}
                  ;(checklist || []).forEach((it) => {
                    const draftAns = draft.answers?.[it._id]
                    merged[it._id] = draftAns
                      ? { yesNoNa: draftAns.yesNoNa || '', responseValue: draftAns.responseValue || '', remarks: draftAns.remarks || '' }
                      : { yesNoNa: '', responseValue: '', remarks: '' }
                  })
                  setAnswers(merged)
                }
              }
            } catch {}
          } catch (checklistErr) {
            console.error('[DEBUG] Error loading checklist items:', checklistErr)
            console.error('[DEBUG] Error details:', {
              message: checklistErr.message,
              response: checklistErr.response?.data,
              status: checklistErr.response?.status,
              statusText: checklistErr.response?.statusText
            })
            // For chiefs, show error instead of empty form
            if (user?.role === 'chief') {
              const errorMsg = checklistErr.response?.data?.message || checklistErr.message || 'Unknown error'
              setLoadError(
                `Unable to load checklist items for this form. ${errorMsg}. Please contact your administrator.`
              )
              setLoading(false)
              return
            }
            
            setItems([])
            setAnswers({})
            const errorMsg = checklistErr.response?.data?.message || checklistErr.message || 'Unknown error'
            setMessage(`Could not load checklist items: ${errorMsg}. Please contact your administrator.`)
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
    setUnitChief('')
    setMessage('')
    setDuplicateExists(false)
    setDuplicateMessage('')
    clearDraft()
    const init = {}
    items.forEach((it) => {
      init[it._id] = {
        yesNoNa: '',
        responseValue: '',
        remarks: '',
      }
    })
    setAnswers(init)
  }

  const handleSaveDraftAndLeave = () => {
    saveDraft()
  }

  const handleDiscardAndLeave = () => {
    resetToNewForm()
    clearDraft()
  }

  const handleRestoreDraft = () => {
    if (!draftToRestore) return
    setUhid(draftToRestore.uhid || '')
    setIpid(draftToRestore.ipid || '')
    setPatientName(draftToRestore.patientName || '')
    setWard(draftToRestore.ward || '')
    setUnitNo(draftToRestore.unitNo || '')
    setUnitChief(draftToRestore.unitChief || '')
    // Merge draft answers with current items (form structure may have changed)
    const merged = {}
    items.forEach((it) => {
      const draftAns = draftToRestore.answers?.[it._id]
      merged[it._id] = draftAns
        ? { yesNoNa: draftAns.yesNoNa || '', responseValue: draftAns.responseValue || '', remarks: draftAns.remarks || '' }
        : { yesNoNa: '', responseValue: '', remarks: '' }
    })
    setAnswers(merged)
    setDraftToRestore(null)
    setShowRestoreDraftModal(false)
  }

  const handleDiscardDraft = () => {
    clearDraft()
    setDraftToRestore(null)
    setShowRestoreDraftModal(false)
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
        unitChief: unitChief.trim(),
        items: items.map((it) => ({
          checklistItemId: it._id,
          ...answers[it._id],
        })),
      }
      
      // Create new submission
      await apiClient.post('/audits', payload)
      clearDraft()
      // Show success popup
      setSubmittedUHID(uhid.trim())
      setSubmittedPatientName(patientName.trim())
      setShowSuccessModal(true)
      // Reset form
      resetToNewForm()
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to submit form'
      if (errorMsg.includes('No Duplicate IPID') || errorMsg.includes('already been submitted')) {
        setMessage('Duplicate: A checklist has already been submitted for this UHID, IPID, and Department. Only one submission per admission per department is allowed.')
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
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-xl border-2 border-indigo-200 p-8 sm:p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Loading form...</h2>
          <p className="text-slate-600 text-sm">Please wait while we load the checklist.</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (loadError) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 px-4 py-6">
        <div className="bg-white/95 backdrop-blur-md border border-indigo-200/50 rounded-2xl shadow-xl px-5 py-4 sm:py-5">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Form Access Restricted</h1>
          <p className="text-sm text-slate-600">Unable to access this form</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">📋</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Access Denied</h3>
              <p className="text-slate-700 mb-4 leading-relaxed">{loadError}</p>
              
              {user?.role === 'chief' && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mt-4">
                  <p className="text-sm font-semibold text-slate-900 mb-2">What you can do:</p>
                  <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                    <li>Check the navigation menu for forms assigned to your department</li>
                    <li>Contact your administrator to assign this form to your department</li>
                    <li>Use the "Department Logs" page to view submissions from your department</li>
                  </ul>
                </div>
              )}
              
              {formTemplate && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold">Form:</span> {formTemplate.name}
                  </p>
                  {formTemplate.description && (
                    <p className="text-sm text-slate-600 mt-1">
                      <span className="font-semibold">Description:</span> {formTemplate.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-4">
          <Link
            to="/"
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-sm transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <Link
            to="/admin/department-logs"
            className="px-6 py-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors"
          >
            View Department Logs
          </Link>
        </div>
      </div>
    )
  }

  // Show not found state
  if (!formTemplate) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-8 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Form not found</h2>
          <p className="text-slate-600 mb-4">Please select a valid form from the sidebar or dashboard.</p>
          <Link
            to="/"
            className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 px-4 py-4">
      {/* Page header - form name and back link */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-indigo-200/50 px-5 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <Link
              to="/"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 mb-2 inline-block"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">{formTemplate.name}</h1>
            {formTemplate.description && (
              <p className="text-slate-600 text-sm mt-1">{formTemplate.description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-500">Checklist items: {items.length}</div>
              {hasUnsavedChanges && (
                <button
                  type="button"
                  onClick={resetToNewForm}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
                >
                  Start fresh
                </button>
              )}
            </div>
            {lastDraftSavedAt && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Draft saved
              </div>
            )}
          </div>
        </div>
      </div>

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
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-indigo-200/50 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Patient Information <span className="text-red-500">*</span>
              <span className="text-xs font-normal text-slate-600 ml-2">(All fields are mandatory)</span>
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
                  className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
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
                  className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                    duplicateExists ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                  }`}
                  required
                  disabled={duplicateExists}
                />
                {checkingDuplicate && (
                  <div className="text-xs text-indigo-600 mt-1.5 flex items-center gap-2">
                    <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-indigo-600 border-t-transparent"></span>
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
                  className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
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
                <select
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                    duplicateExists ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                  }`}
                  required
                  disabled={duplicateExists}
                >
                  <option value="">Select Ward</option>
                  {wards.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Unit No <span className="text-red-500">*</span>
                </label>
                <select
                  value={unitNo}
                  onChange={(e) => setUnitNo(e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                    duplicateExists ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                  }`}
                  required
                  disabled={duplicateExists}
                >
                  <option value="">Select Unit No</option>
                  {units.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Unit Chief <span className="text-red-500">*</span>
                </label>
                <select
                  value={unitChief}
                  onChange={(e) => setUnitChief(e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                    duplicateExists ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                  }`}
                  required
                  disabled={duplicateExists}
                >
                  <option value="">Select Unit Chief</option>
                  {chiefDoctors.map((chief) => (
                    <option key={chief._id} value={chief.name}>
                      {chief.name} {chief.designation && `- ${chief.designation}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Checklist Sections */}
        {Object.keys(itemsBySection).length === 0 ? (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-indigo-200/50 p-6 text-center">
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
              <div key={sectionName} className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-indigo-200/50 overflow-hidden">
                {/* Section Header */}
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
                  <h3 className="font-semibold text-sm text-slate-900">
                    {sectionName}
                  </h3>
                </div>

                {/* Table Layout */}
                <div className="overflow-x-auto -mx-2 sm:mx-0">
                  <table className="w-full min-w-[640px]">
                    <thead className="bg-slate-100 border-b-2 border-slate-200">
                      <tr>
                        <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-bold text-[10px] sm:text-xs text-slate-700 uppercase tracking-wide w-[35%]">Checklist Item</th>
                        <th className="text-center px-2 sm:px-4 py-2 sm:py-3 font-bold text-[10px] sm:text-xs text-slate-700 uppercase tracking-wide w-[15%]">Response</th>
                        <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-bold text-[10px] sm:text-xs text-slate-700 uppercase tracking-wide w-[25%]">Remarks</th>
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
                              <td className="px-2 sm:px-4 py-2 sm:py-3 align-top">
                                <div className="font-semibold text-xs sm:text-sm text-slate-800 mb-1">{it.label}</div>
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
                              <td className="px-2 sm:px-4 py-2 sm:py-3 align-middle" colSpan={isTextType ? 3 : 1}>
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
                                        placeholder="Remarks required when NO"
                                        required
                                      />
                                    ) : (
                                      <span className="text-xs text-slate-400 italic">N/A</span>
                                    )}
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
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-indigo-200/50 p-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={resetToNewForm}
              className="px-6 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-all text-sm"
            >
              Reset Form
            </button>
            <button
              type="submit"
              disabled={submitting || duplicateExists || checkingDuplicate}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-8 py-2.5 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm text-sm flex items-center gap-2"
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
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors shadow-sm"
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

