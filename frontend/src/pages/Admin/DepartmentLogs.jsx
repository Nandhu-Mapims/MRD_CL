import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

export function DepartmentLogs() {
  const [logs, setLogs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedForms, setExpandedForms] = useState(new Set())
  const [uhidSearchByDept, setUhidSearchByDept] = useState({})
  const [uhidPageByDept, setUhidPageByDept] = useState({})
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [selectedUhid, setSelectedUhid] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [admissions, setAdmissions] = useState([])
  const [groupsFromUHID, setGroupsFromUHID] = useState([])
  const [selectedIPID, setSelectedIPID] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [loadingAdmissions, setLoadingAdmissions] = useState(false)

  // Build preview data from submissions (date+time+IPID group)
  const buildPreviewFromSubmissions = (submissions, uhidVal) => {
    if (!submissions || submissions.length === 0) return null
    const patient = submissions[0]?.patient || { uhid: uhidVal || selectedUhid, patientName: submissions[0]?.patientName || 'N/A' }
    const deptMap = new Map()
    submissions.forEach(sub => {
      const deptId = sub.department?._id || sub.department
      const deptName = sub.department?.name || 'Unknown Department'
      const deptCode = sub.department?.code || 'N/A'
      if (!deptMap.has(deptId)) {
        deptMap.set(deptId, {
          department: { _id: deptId, name: deptName, code: deptCode },
          sections: new Map(),
          submittedBy: sub.submittedBy,
          submittedAt: sub.submittedAt
        })
      }
      const deptData = deptMap.get(deptId)
      const sectionName = sub.checklistItemId?.section || 'General'
      if (!deptData.sections.has(sectionName)) {
        deptData.sections.set(sectionName, { sectionName, items: [] })
      }
      deptData.sections.get(sectionName).items.push({
        checklistItemId: {
          _id: sub.checklistItemId?._id,
          label: sub.checklistItemId?.label || 'N/A',
          responseType: sub.checklistItemId?.responseType || 'YES_NO'
        },
        responseValue: sub.responseValue || sub.yesNoNa || 'N/A',
        remarks: sub.remarks || '-',
        corrective: sub.corrective || '-',
        preventive: sub.preventive || '-',
      })
    })
    return {
      patient,
      departments: Array.from(deptMap.values()).map(dept => ({
        department: dept.department,
        sections: Array.from(dept.sections.values()),
        submittedBy: dept.submittedBy,
        submittedAt: dept.submittedAt
      }))
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      setError(null)
      const data = await apiClient.get('/departments/logs')
      setLogs(data)
    } catch (err) {
      console.error('Error loading department logs', err)
      setError(err.response?.data?.message || err.message || 'Failed to load department logs')
    } finally {
      setLoading(false)
    }
  }

  const toggleFormExpand = (formKey) => {
    const newExpanded = new Set(expandedForms)
    if (newExpanded.has(formKey)) {
      newExpanded.delete(formKey)
    } else {
      newExpanded.add(formKey)
    }
    setExpandedForms(newExpanded)
  }

  const PAGE_SIZE = 3

  const matchesSelectedDepartment = (sub, department) => {
    if (!department) return true

    const selectedId = String(department._id || department.id || '')
    const selectedCode = String(department.code || '').toUpperCase()
    const selectedName = String(department.name || '').toUpperCase()

    const subDept = sub?.department || null
    const subDeptId = String(subDept?._id || subDept?.id || subDept || '')
    const subDeptCode = String(subDept?.code || '').toUpperCase()
    const subDeptName = String(subDept?.name || '').toUpperCase()

    if (selectedId && subDeptId && selectedId === subDeptId) return true
    if (selectedCode && subDeptCode && selectedCode === subDeptCode) return true
    if (selectedName && subDeptName && selectedName === subDeptName) return true
    return false
  }

  const handleUhidSearchChange = (deptId, value) => {
    setUhidSearchByDept((prev) => ({ ...prev, [deptId]: value }))
    setUhidPageByDept((prev) => ({ ...prev, [deptId]: 1 }))
  }

  const handleUhidPageChange = (deptId, page) => {
    setUhidPageByDept((prev) => ({ ...prev, [deptId]: page }))
  }

  // Load admissions or submission groups for UHID (prefer grouped by date+time+IPID)
  const loadAdmissionsForPreview = async (uhid, department = selectedDepartment, fallbackGroups = []) => {
    if (!uhid || !uhid.trim()) return
    
    setLoadingAdmissions(true)
    setAdmissions([])
    setGroupsFromUHID([])
    setSelectedIPID(null)
    setSelectedGroup(null)
    setPreviewData(null)
    
    try {
      const normalizedUHID = uhid.trim().toUpperCase()
      let groups = []
      try {
        const auditsRes = await apiClient.get(`/audits/uhid/${encodeURIComponent(normalizedUHID)}`)
        if (auditsRes?.groupedByDateAndIPID && auditsRes.groupedByDateAndIPID.length > 0) {
          groups = auditsRes.groupedByDateAndIPID
            .map((group) => {
              const filteredSubmissions = (group.submissions || []).filter((sub) =>
                matchesSelectedDepartment(sub, department)
              )
              return {
                ...group,
                submissions: filteredSubmissions
              }
            })
            .filter((group) => group.submissions.length > 0)
          setGroupsFromUHID(groups)
        }
      } catch (auditErr) {
        if (auditErr.response?.status !== 404) console.error('Error loading audits by UHID:', auditErr)
      }
      if (groups.length === 0) {
        try {
          const submissions = await apiClient.get(`/audits/uhid/${encodeURIComponent(normalizedUHID)}`)
          const raw = submissions?.submissions || (Array.isArray(submissions) ? submissions : [])
          const filteredRaw = raw.filter((sub) => matchesSelectedDepartment(sub, department))

          if (filteredRaw.length > 0) {
            const groupedMap = new Map()
            filteredRaw.forEach((sub) => {
              const key = `${sub.ipid || 'N/A'}_${sub.auditDate || ''}_${sub.auditTime || ''}_${sub.formTemplate?._id || sub.formTemplate || ''}`
              if (!groupedMap.has(key)) {
                groupedMap.set(key, {
                  ipid: sub.ipid,
                  date: sub.auditDate || sub.submittedAt,
                  auditTime: sub.auditTime || '',
                  submissions: []
                })
              }
              groupedMap.get(key).submissions.push(sub)
            })
            const syntheticGroups = Array.from(groupedMap.values())
            setGroupsFromUHID(syntheticGroups)

            const uniqueIPIDs = [...new Set(filteredRaw.map((s) => s.ipid).filter(Boolean))]
            const virtualAdmissions = uniqueIPIDs.map((ipid) => {
              const subWithIPID = filteredRaw.find((s) => s.ipid === ipid)
              return {
                ipid,
                uhid: normalizedUHID,
                admissionDate: subWithIPID?.submittedAt || new Date(),
                status: 'Admitted',
                ward: subWithIPID?.admission?.ward || subWithIPID?.ward || subWithIPID?.patient?.ward || 'N/A',
                unitNo: subWithIPID?.admission?.unitNo || subWithIPID?.unitNo || subWithIPID?.patient?.unitNo || 'N/A',
                isVirtual: true
              }
            })
            setAdmissions(virtualAdmissions)
          } else {
            setAdmissions([])
          }
        } catch (subErr) {
          console.error('Error loading submissions as fallback:', subErr)
        }
      }

      // Use department-log preloaded groups only when API-side grouped data is unavailable
      if (groups.length === 0 && fallbackGroups && fallbackGroups.length > 0) {
        setGroupsFromUHID(fallbackGroups)
      }
    } catch (err) {
      console.error('[loadAdmissionsForPreview] Error loading admissions:', err)
      console.error('[loadAdmissionsForPreview] Error details:', err.response?.data || err.message)
      console.error('[loadAdmissionsForPreview] Error status:', err.response?.status)
      console.error('[loadAdmissionsForPreview] Full error:', err)
      
      setAdmissions([])
      
      // Check if it's a network/connection error or timeout
      if (err.message?.includes('connect') || err.message?.includes('Network') || err.message?.includes('timeout') || err.response?.status === 0) {
        const errorMsg = err.message?.includes('timeout') 
          ? 'Request timed out. Please ensure the backend server is running on port 5000 and try again.'
          : 'Cannot connect to backend server. Please ensure the backend server is running on port 5000.'
        
        setPreviewData({
          error: errorMsg,
          patient: { uhid: uhid.trim().toUpperCase(), patientName: 'N/A' },
          departments: []
        })
        setLoadingAdmissions(false)
        return
      }
      
      // Check for authentication errors
      if (err.response?.status === 401) {
        setPreviewData({
          error: 'Authentication failed. Please log out and log in again.',
          patient: { uhid: uhid.trim().toUpperCase(), patientName: 'N/A' },
          departments: []
        })
        setLoadingAdmissions(false)
        return
      }
      
      // Show error in UI
      if (err.response?.status === 404) {
        // 404 is okay - just means no admissions found, try fallback
        console.log('[loadAdmissionsForPreview] No admissions found, trying submissions fallback...')
      } else {
        // Other errors - show in preview data
        setPreviewData({
          error: err.response?.data?.message || err.message || 'Failed to load admissions. Please check console for details.',
          patient: { uhid: uhid.trim().toUpperCase(), patientName: 'N/A' },
          departments: []
        })
      }
    } finally {
      setLoadingAdmissions(false)
    }
  }

  // Load checklist for specific IPID
  const loadChecklistByIPID = async (ipid, department = selectedDepartment) => {
    if (!ipid || !ipid.trim()) return
    
    setLoadingPreview(true)
    setSelectedIPID(ipid.trim().toUpperCase())
    setPreviewData(null)
    
    try {
      // Get all submissions for this IPID grouped by department
      const submissions = await apiClient.get(`/audits/ipid/${encodeURIComponent(ipid.trim().toUpperCase())}`)
      const filteredSubmissions = (submissions || []).filter((sub) =>
        matchesSelectedDepartment(sub, department)
      )
      
      if (!filteredSubmissions || filteredSubmissions.length === 0) {
        setPreviewData({
          patient: { uhid: selectedUhid || 'N/A', patientName: 'N/A' },
          departments: []
        })
        return
      }

      // Transform flat array of submissions into structured format
      const patient = filteredSubmissions[0]?.patient || {
        uhid: selectedUhid || 'N/A',
        patientName: filteredSubmissions[0]?.patientName || 'N/A'
      }

      // Group submissions by department and section
      const deptMap = new Map()
      
      filteredSubmissions.forEach(sub => {
        const deptId = sub.department?._id || sub.department
        const deptName = sub.department?.name || 'Unknown Department'
        const deptCode = sub.department?.code || 'N/A'
        
        if (!deptMap.has(deptId)) {
          deptMap.set(deptId, {
            department: { _id: deptId, name: deptName, code: deptCode },
            sections: new Map(),
            submittedBy: sub.submittedBy,
            submittedAt: sub.submittedAt
          })
        }
        
        const deptData = deptMap.get(deptId)
        const sectionName = sub.checklistItemId?.section || 'General'
        
        if (!deptData.sections.has(sectionName)) {
          deptData.sections.set(sectionName, {
            sectionName,
            items: []
          })
        }
        
        const section = deptData.sections.get(sectionName)
        section.items.push({
          checklistItemId: {
            _id: sub.checklistItemId?._id,
            label: sub.checklistItemId?.label || 'N/A',
            responseType: sub.checklistItemId?.responseType || 'YES_NO'
          },
          responseValue: sub.responseValue || sub.yesNoNa || 'N/A',
          remarks: sub.remarks || '-',
          corrective: sub.corrective || '-',
          preventive: sub.preventive || '-',
        })
      })
      
      // Convert Maps to arrays
      const departments = Array.from(deptMap.values()).map(dept => ({
        department: dept.department,
        sections: Array.from(dept.sections.values()),
        submittedBy: dept.submittedBy,
        submittedAt: dept.submittedAt
      }))
      
      setPreviewData({
        patient,
        departments
      })
    } catch (err) {
      console.error('Error loading checklist by IPID:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load data'
      setPreviewData({ 
        error: errorMessage,
        patient: { uhid: selectedUhid || 'N/A', patientName: 'N/A' },
        departments: [] 
      })
    } finally {
      setLoadingPreview(false)
    }
  }

  const loadPreviewData = async (uhid, department, fallbackGroups = []) => {
    if (!uhid || !uhid.trim()) return
    
    setPreviewModalOpen(true)
    setSelectedUhid(uhid.trim().toUpperCase())
    setSelectedDepartment(department || null)
    setPreviewData(null)
    setSelectedIPID(null)
    
    // First, load admissions list
    await loadAdmissionsForPreview(uhid.trim(), department || null, fallbackGroups)
  }

  const handleIPIDClick = async (ipid) => {
    await loadChecklistByIPID(ipid, selectedDepartment)
  }

  const handleGroupClick = (group) => {
    setSelectedGroup(group)
    setSelectedIPID(group.ipid)
    const data = buildPreviewFromSubmissions(group.submissions, selectedUhid)
    if (data) setPreviewData(data)
  }

  const handleFallbackGroupClick = async (group) => {
    if (!group?.ipid) return

    setLoadingPreview(true)
    setSelectedGroup(group)
    setSelectedIPID(group.ipid)
    setPreviewData(null)

    try {
      const submissions = await apiClient.get(`/audits/ipid/${encodeURIComponent(String(group.ipid).trim().toUpperCase())}`)

      // Start with selected-department filtering.
      let filtered = (submissions || []).filter((sub) => matchesSelectedDepartment(sub, selectedDepartment))

      // Narrow down to the exact form session (form + date + time) when possible.
      const refSub = group.submissions?.[0]
      const refFormId = refSub?.formTemplate?._id || refSub?.formTemplate || null
      const refFormName = refSub?.formTemplate?.name || refSub?.formTemplateName || null
      const refAuditTime = group.auditTime || null
      const refDate = group.date ? new Date(group.date).toISOString().slice(0, 10) : null

      filtered = filtered.filter((sub) => {
        const subFormId = sub?.formTemplate?._id || sub?.formTemplate || null
        const subFormName = sub?.formTemplate?.name || null
        const subDate = (sub.auditDate ? new Date(sub.auditDate) : new Date(sub.submittedAt)).toISOString().slice(0, 10)
        const subTime = sub.auditTime || (sub.submittedAt ? new Date(sub.submittedAt).toISOString().slice(11, 16) : null)

        const formMatch =
          (refFormId && subFormId && String(refFormId) === String(subFormId)) ||
          (refFormName && subFormName && String(refFormName) === String(subFormName)) ||
          (!refFormId && !refFormName)

        const dateMatch = refDate ? subDate === refDate : true
        const timeMatch = refAuditTime ? subTime === refAuditTime : true

        return formMatch && dateMatch && timeMatch
      })

      // If strict filter returns nothing, keep department-filtered data as fallback.
      if (filtered.length === 0) {
        filtered = (submissions || []).filter((sub) => matchesSelectedDepartment(sub, selectedDepartment))
      }

      const data = buildPreviewFromSubmissions(filtered, selectedUhid)
      if (data) setPreviewData(data)
      else {
        setPreviewData({
          patient: { uhid: selectedUhid || 'N/A', patientName: 'N/A' },
          departments: []
        })
      }
    } catch (err) {
      console.error('Error loading fallback group checklist:', err)
      setPreviewData({
        error: err.response?.data?.message || err.message || 'Failed to load checklist',
        patient: { uhid: selectedUhid || 'N/A', patientName: 'N/A' },
        departments: []
      })
    } finally {
      setLoadingPreview(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDateOnly = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getTimeAgo = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return formatDateOnly(dateString)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-slate-600 font-medium">Loading department logs...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white/95 backdrop-blur-md border border-indigo-200/50 rounded-2xl shadow-xl px-5 py-4 sm:py-5">
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Department Activity Logs</h1>
          <p className="mt-1 text-sm text-slate-600">Track form submissions and edits across all departments</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-800 font-semibold mb-2">Error Loading Department Logs</p>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={loadLogs}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!logs || !logs.departments || logs.departments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white/95 backdrop-blur-md border border-indigo-200/50 rounded-2xl shadow-xl px-5 py-4 sm:py-5">
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Department Activity Logs</h1>
          <p className="mt-1 text-sm text-slate-600">Department-wise UHID, IPID and checklist drilldown</p>
        </div>
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-12 text-center border border-dashed border-slate-300">
          <svg className="w-16 h-16 mx-auto mb-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-slate-700 text-lg font-medium mb-2">No department activity yet</p>
          <p className="text-sm text-slate-500">
            Start submitting forms to see logs here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md border border-indigo-200/50 rounded-2xl shadow-xl px-5 py-4 sm:py-5">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Department Activity Logs</h1>
        <p className="mt-1 text-sm text-slate-600">
          Department-wise view based on form/submission department labels
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600 mb-1 font-medium uppercase tracking-wide">
                Total Departments
              </p>
              <p className="text-3xl font-bold text-slate-900">{logs.totalDepartments || logs.departments.length}</p>
            </div>
            <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600 mb-1 font-medium uppercase tracking-wide">
                Total Forms Submitted
              </p>
              <p className="text-3xl font-bold text-slate-900">
                {logs.departments.reduce((sum, dept) => sum + (dept.totalFormsSubmitted || 0), 0)}
              </p>
            </div>
            <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600 mb-1 font-medium uppercase tracking-wide">
                Recently Edited
              </p>
              <p className="text-3xl font-bold text-amber-600">
                {logs.departments.reduce((sum, dept) => sum + (dept.recentlyEditedCount || 0), 0)}
              </p>
            </div>
            <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Department Logs */}
      <div className="space-y-4">
        {logs.departments.map((deptLog) => {
          const isExpanded = expandedForms.has(deptLog.department._id)
          const deptUhidMap = Object.values(
            (deptLog.allSubmissions || []).reduce((acc, sub) => {
              const uhid = sub.uhid || 'N/A'
              if (!acc[uhid]) {
                acc[uhid] = {
                  uhid,
                  patientName: sub.patientName || 'N/A',
                  submissions: 0,
                  lastSubmissionAt: null
                }
              }
              acc[uhid].submissions += 1
              if (!acc[uhid].lastSubmissionAt || new Date(sub.submittedAt) > new Date(acc[uhid].lastSubmissionAt)) {
                acc[uhid].lastSubmissionAt = sub.submittedAt
              }

              return acc
            }, {})
          )
          const sortedUhids = deptUhidMap.sort((a, b) => new Date(b.lastSubmissionAt || 0) - new Date(a.lastSubmissionAt || 0))
          const deptId = deptLog.department._id
          const searchText = (uhidSearchByDept[deptId] || '').trim().toLowerCase()
          const filteredUhids = sortedUhids.filter((entry) =>
            entry.uhid?.toLowerCase().includes(searchText) || entry.patientName?.toLowerCase().includes(searchText)
          )
          const totalPages = Math.max(1, Math.ceil(filteredUhids.length / PAGE_SIZE))
          const currentPage = Math.min(uhidPageByDept[deptId] || 1, totalPages)
          const pageStart = (currentPage - 1) * PAGE_SIZE
          const paginatedUhids = filteredUhids.slice(pageStart, pageStart + PAGE_SIZE)
          const showingFrom = filteredUhids.length === 0 ? 0 : pageStart + 1
          const showingTo = Math.min(pageStart + PAGE_SIZE, filteredUhids.length)

          return (
            <div
              key={deptLog.department._id}
              className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
            >
              <div
                className="bg-slate-50/80 p-4 sm:p-5 cursor-pointer hover:bg-slate-100 transition-colors border-b border-slate-200"
                onClick={() => toggleFormExpand(deptLog.department._id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">{deptLog.department.name}</h3>
                    <div className="mt-2">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-medium rounded-full border border-indigo-100">
                        {deptLog.department.code}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-slate-600">UHIDs:</span>
                        <span className="ml-2 font-bold text-slate-800">{sortedUhids.length}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Submissions:</span>
                        <span className="ml-2 font-bold text-slate-800">{deptLog.totalSubmissions || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Last:</span>
                        <span className="ml-2 font-semibold text-slate-700">
                          {deptLog.latestSubmissionDate ? getTimeAgo(deptLog.latestSubmissionDate) : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="text-slate-600 hover:text-slate-800 transition-colors mt-1">
                    {isExpanded ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <h4 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                      <span className="inline-block w-1 h-5 rounded-full bg-violet-500" />
                      UHID List
                    </h4>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={uhidSearchByDept[deptId] || ''}
                          onChange={(e) => handleUhidSearchChange(deptId, e.target.value)}
                          placeholder="Search UHID..."
                          className="w-44 sm:w-52 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                        />
                      </div>
                    </div>
                  </div>

                  {filteredUhids.length === 0 ? (
                    <div className="text-sm text-slate-500">No UHID records for this department.</div>
                  ) : (
                    <div className="bg-slate-50 rounded-xl p-3 sm:p-4">
                      <div className="space-y-2">
                        {paginatedUhids.map((entry, idx) => (
                          <button
                            key={`${deptLog.department._id}-${entry.uhid}`}
                            type="button"
                            onClick={() => loadPreviewData(entry.uhid, deptLog.department)}
                            className="w-full text-left bg-white border border-slate-200 hover:border-violet-300 rounded-xl p-3 sm:p-4 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-semibold text-sm shrink-0">
                                  {String(pageStart + idx + 1).padStart(2, '0')}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-violet-700 truncate">UHID: {entry.uhid}</p>
                                  <p className="text-xs sm:text-sm text-slate-600 truncate">Patient: {entry.patientName}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 sm:gap-6 text-right">
                                <div>
                                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Submissions</p>
                                  <p className="text-sm font-bold text-slate-700">{entry.submissions}</p>
                                </div>
                                <div className="hidden sm:block">
                                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Last Update</p>
                                  <p className="text-xs text-slate-600">{entry.lastSubmissionAt ? formatDate(entry.lastSubmissionAt) : 'N/A'}</p>
                                </div>
                                <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-lg">
                                  ›
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">
                        <p>
                          Showing {showingFrom}-{showingTo} of {filteredUhids.length} records
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={currentPage === 1}
                            onClick={() => handleUhidPageChange(deptId, Math.max(1, currentPage - 1))}
                            className="w-7 h-7 rounded-md border border-slate-200 disabled:opacity-40"
                          >
                            ‹
                          </button>
                          {Array.from({ length: totalPages }).map((_, i) => {
                            const page = i + 1
                            const active = page === currentPage
                            return (
                              <button
                                key={`${deptId}-page-${page}`}
                                type="button"
                                onClick={() => handleUhidPageChange(deptId, page)}
                                className={`w-7 h-7 rounded-md text-xs ${
                                  active ? 'bg-violet-600 text-white' : 'border border-slate-200 text-slate-600'
                                }`}
                              >
                                {page}
                              </button>
                            )
                          })}
                          <button
                            type="button"
                            disabled={currentPage === totalPages}
                            onClick={() => handleUhidPageChange(deptId, Math.min(totalPages, currentPage + 1))}
                            className="w-7 h-7 rounded-md border border-slate-200 disabled:opacity-40"
                          >
                            ›
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Data Preview Modal - Grouped by UHID and Department */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-slate-900 mb-1">
                  {selectedIPID ? (
                    <>Checklist - IPID: <span className="font-mono">{selectedIPID}</span></>
                  ) : (
                    <>Admissions - UHID: <span className="font-mono">{selectedUhid}</span></>
                  )}
                </h2>
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  {previewData?.patient?.patientName ? (
                    <span className="font-medium">Patient: {previewData.patient.patientName}</span>
                  ) : selectedUhid && !selectedIPID && groupsFromUHID.length > 0 && (groupsFromUHID[0]?.submissions?.[0]?.patient?.patientName || groupsFromUHID[0]?.submissions?.[0]?.patientName) ? (
                    <span className="font-medium">Patient: {groupsFromUHID[0].submissions[0].patient?.patientName || groupsFromUHID[0].submissions[0].patientName}</span>
                  ) : selectedUhid && !selectedIPID && loadingAdmissions ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-indigo-700"></span>
                      Loading...
                    </span>
                  ) : selectedIPID && loadingPreview ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-indigo-700"></span>
                      Loading checklist...
                    </span>
                  ) : selectedUhid && !selectedIPID ? (
                    <span className="text-slate-500">UHID: {selectedUhid}</span>
                  ) : null}
                  {selectedDepartment?.name && (
                    <span className="text-xs text-slate-500">
                      Department: {selectedDepartment.name} ({selectedDepartment.code || 'N/A'})
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setPreviewModalOpen(false)
                  setSelectedUhid('')
                  setSelectedDepartment(null)
                  setPreviewData(null)
                }}
                className="ml-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-2 transition-colors text-2xl font-bold w-10 h-10 flex items-center justify-center"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* List: groups (date+time+IPID) or admissions (IPID) */}
              {selectedUhid && !selectedIPID && !previewData?.departments?.length && (
                <div className="mb-6">
                  {loadingAdmissions ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                      <div className="text-slate-600 font-medium">Loading...</div>
                      <div className="text-xs text-slate-400 mt-2">
                        If this takes too long, check if backend server is running on port 5000
                      </div>
                    </div>
                  ) : groupsFromUHID.length > 0 ? (
                    (() => {
                      // Group all audits by IPID – one box per IPID, Ward/Unit at top, checklist buttons inside
                      const byIPID = new Map()
                      groupsFromUHID.forEach((group) => {
                        const ipid = (group.ipid || '').toString().trim().toUpperCase()
                        if (!ipid) return
                        if (!byIPID.has(ipid)) {
                          byIPID.set(ipid, {
                            ipid,
                            ward: group.submissions?.[0]?.admission?.ward || group.submissions?.[0]?.ward || group.submissions?.[0]?.patient?.ward || 'N/A',
                            unitNo: group.submissions?.[0]?.admission?.unitNo || group.submissions?.[0]?.unitNo || group.submissions?.[0]?.patient?.unitNo || 'N/A',
                            groups: []
                          })
                        }
                        byIPID.get(ipid).groups.push(group)
                      })
                      // Sort groups within each IPID by time (newest first)
                      byIPID.forEach((entry) => {
                        entry.groups.sort((a, b) => {
                          const tA = a.submissions?.[0]?.submittedAt ? new Date(a.submissions[0].submittedAt).getTime() : 0
                          const tB = b.submissions?.[0]?.submittedAt ? new Date(b.submissions[0].submittedAt).getTime() : 0
                          return tB - tA
                        })
                      })
                      const ipidEntries = Array.from(byIPID.values())
                      return (
                        <div className="space-y-5">
                          {ipidEntries.map((entry) => (
                            <div
                              key={entry.ipid}
                              className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                            >
                              <div className="bg-gradient-to-r from-slate-50 to-blue-50/30 border-b border-slate-200 px-5 py-3.5">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="text-lg font-bold text-blue-700">IPID: {entry.ipid}</span>
                                  <span className="text-sm font-medium text-slate-600 bg-white/80 border border-slate-200 px-2.5 py-1 rounded-md shadow-sm">
                                    Ward: {entry.ward}
                                  </span>
                                  <span className="text-sm font-medium text-slate-600 bg-white/80 border border-slate-200 px-2.5 py-1 rounded-md shadow-sm">
                                    Unit: {entry.unitNo}
                                  </span>
                                </div>
                              </div>
                              <div className="p-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {entry.groups.map((group, gIdx) => {
                                    const baseSubmissions = group.submissions || []
                                    const primaryFormId = baseSubmissions?.[0]?.formTemplate?._id || baseSubmissions?.[0]?.formTemplate || null
                                    const primaryFormName = baseSubmissions?.[0]?.formTemplate?.name || null

                                    // Important: evaluate per checklist card (form), not all submissions in same IPID/time bucket
                                    const checklistSubmissions = baseSubmissions.filter((sub) => {
                                      const subFormId = sub?.formTemplate?._id || sub?.formTemplate || null
                                      const subFormName = sub?.formTemplate?.name || null
                                      if (primaryFormId && subFormId) return String(primaryFormId) === String(subFormId)
                                      if (primaryFormName && subFormName) return String(primaryFormName) === String(subFormName)
                                      return true
                                    })

                                    const checklistName = checklistSubmissions?.[0]?.formTemplate?.name || baseSubmissions?.[0]?.formTemplate?.name || 'Checklist'
                                    const dateStr = group.date ? new Date(group.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'
                                    const timeStr = group.auditTime || (checklistSubmissions?.[0]?.submittedAt ? new Date(checklistSubmissions[0].submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '')
                                    const yesNoResponses = (checklistSubmissions || [])
                                      .map((sub) => {
                                        const responseType = String(sub?.checklistItemId?.responseType || '').trim().toUpperCase()
                                        const value = String(sub.responseValue || sub.yesNoNa || '').trim().toUpperCase()

                                        // Primary rule: explicit YES_NO response type
                                        if (responseType === 'YES_NO') return value

                                        // Fallback rule: infer YES/NO questions by value when responseType is missing
                                        if (value === 'YES' || value === 'NO') return value

                                        return null
                                      })
                                      .filter(Boolean)

                                    const allYes =
                                      yesNoResponses.length > 0 &&
                                      yesNoResponses.every((value) => value === 'YES')
                                    return (
                                      <button
                                        key={gIdx}
                                        type="button"
                                        onClick={() => {
                                          if (group.__fromDepartmentLogs) {
                                            handleFallbackGroupClick(group)
                                          } else {
                                            handleGroupClick({ ...group, submissions: checklistSubmissions })
                                          }
                                        }}
                                        className={`group flex items-start gap-3 text-left p-4 rounded-xl border shadow-sm hover:shadow transition-all duration-200 ${
                                          allYes
                                            ? 'border-emerald-300 bg-emerald-50/70 hover:border-emerald-400 hover:bg-emerald-100/60'
                                            : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'
                                        }`}
                                      >
                                        <span
                                          className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                                            allYes
                                              ? 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200'
                                              : 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200'
                                          }`}
                                        >
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                        </span>
                                        <div className="min-w-0 flex-1">
                                          <span
                                            className={`block font-semibold text-sm leading-tight ${
                                              allYes
                                                ? 'text-emerald-800 group-hover:text-emerald-900'
                                                : 'text-slate-800 group-hover:text-indigo-700'
                                            }`}
                                          >
                                            {checklistName}
                                          </span>
                                          <span className="block text-[10px] text-slate-400 mt-1">{dateStr} · {timeStr}</span>
                                          {allYes && (
                                            <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700">
                                              All answers are YES
                                            </span>
                                          )}
                                        </div>
                                        <span
                                          className={`flex-shrink-0 transition-colors ${
                                            allYes ? 'text-emerald-500 group-hover:text-emerald-700' : 'text-slate-400 group-hover:text-indigo-500'
                                          }`}
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                          </svg>
                                        </span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()
                  ) : admissions.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="text-4xl mb-2">📭</div>
                      <p className="font-semibold mb-1">No admissions found</p>
                      <p className="text-sm">No admission or audit records for UHID: {selectedUhid}</p>
                      {previewData?.error && (
                        <p className="text-xs mt-2 text-red-600">{previewData.error}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {admissions.map((admission, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleIPIDClick(admission.ipid)}
                          className="w-full text-left p-4 rounded-lg border-2 border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-lg font-bold text-blue-600 hover:text-blue-800 hover:underline">
                                  IPID: {admission.ipid}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                                <div><span className="font-medium">Ward:</span> {admission.ward}</div>
                                <div><span className="font-medium">Unit:</span> {admission.unitNo}</div>
                              </div>
                            </div>
                            <div className="ml-4">
                              <span className="text-blue-600 text-sm font-semibold">View Checklist →</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {loadingPreview ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                  <div className="text-slate-500 font-medium">Loading checklist data...</div>
                </div>
              ) : previewData?.error ? (
                <div className="text-center py-12 text-red-600">
                  <div className="text-4xl mb-3">⚠️</div>
                  <p className="font-semibold mb-2">Error loading data</p>
                  <p className="text-sm text-slate-600">{previewData.error}</p>
                </div>
              ) : previewData && previewData.departments && previewData.departments.length > 0 ? (
                <div className="space-y-6">
                  {/* Patient Info */}
                  <div className="bg-gradient-to-r from-blue-50 to-slate-50 rounded-lg p-5 border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-3 text-base flex items-center gap-2">
                      <span className="text-blue-600">👤</span>
                      Patient Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-600 min-w-[80px]">UHID:</span>
                        <span className="font-mono font-bold text-blue-700">{previewData.patient.uhid}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-600 min-w-[80px]">IPID:</span>
                        <span className="font-mono font-bold text-blue-700">{selectedIPID || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-600 min-w-[120px]">Patient Name:</span>
                        <span className="text-slate-800">{previewData.patient.patientName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Department-wise Data */}
                  {previewData.departments.map((deptData, deptIdx) => (
                    <div key={deptIdx} className="bg-white rounded-lg border-2 border-slate-200 overflow-hidden shadow-sm">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-3">
                        <h3 className="font-bold text-base flex items-center gap-2">
                          <span>🏥</span>
                          {deptData.department.name} 
                          <span className="text-blue-200 font-normal">({deptData.department.code})</span>
                        </h3>
                      </div>
                      <div className="p-5">
                        {(() => {
                          const allSections = deptData.sections || []
                          const nonGenericSections = allSections.filter((section) => {
                            const name = String(section.sectionName || '').trim().toLowerCase()
                            return name !== 'general' && name !== 'other' && name !== 'archived'
                          })

                          // Prefer real form sections. If none exist, fall back to generic sections
                          // so checklist data never appears empty when rows are actually present.
                          const sectionsToRender = nonGenericSections.length > 0 ? nonGenericSections : allSections

                          if (sectionsToRender.length === 0) {
                            return (
                              <p className="text-slate-500 text-sm">
                                No section-wise checklist data available for this department.
                              </p>
                            )
                          }

                          return sectionsToRender.map((section, sectionIdx) => (
                            <div key={sectionIdx} className={sectionIdx > 0 ? "mt-6 pt-6 border-t border-slate-200" : ""}>
                              <h4 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wide border-b-2 border-blue-200 pb-2">
                                {section.sectionName}
                              </h4>
                              <div className="overflow-x-auto -mx-4 px-4">
                                <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
                                  <thead className="bg-slate-100">
                                    <tr>
                                      <th className="px-4 py-3 text-left font-semibold text-slate-700 align-top w-12">#</th>
                                      <th className="px-4 py-3 text-left font-semibold text-slate-700 align-top min-w-[200px]">
                                        Item
                                      </th>
                                      <th className="px-4 py-3 text-center font-semibold text-slate-700 align-top w-[100px]">
                                        Response
                                      </th>
                                      <th className="px-4 py-3 text-left font-semibold text-slate-700 align-top min-w-[150px]">
                                        Remarks
                                      </th>
                                      <th className="px-4 py-3 text-left font-semibold text-slate-700 align-top min-w-[150px]">
                                        Corrective
                                      </th>
                                      <th className="px-4 py-3 text-left font-semibold text-slate-700 align-top min-w-[150px]">
                                        Preventive
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {section.items.map((item, itemIdx) => {
                                      return (
                                      <tr key={itemIdx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 align-top text-slate-500 font-medium">{itemIdx + 1}</td>
                                        <td className="px-4 py-3 align-top text-slate-800">
                                          <div className="font-medium leading-relaxed">
                                            {item.checklistItemId?.label || 'N/A'}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 align-top text-center">
                                          <span className="font-semibold text-slate-700">
                                            {item.responseValue || item.yesNoNa || 'N/A'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 align-top text-slate-600">
                                          <div className="break-words max-w-[200px]">
                                            {item.remarks && item.remarks !== '-' ? item.remarks : (
                                              <span className="text-slate-400 italic">-</span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 align-top text-slate-600">
                                          <div className="break-words max-w-[150px]">
                                            {item.corrective && item.corrective !== '-' ? item.corrective : (
                                              <span className="text-slate-400 italic">-</span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 align-top text-slate-600">
                                          <div className="break-words max-w-[150px]">
                                            {item.preventive && item.preventive !== '-' ? item.preventive : (
                                              <span className="text-slate-400 italic">-</span>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))
                        })()}
                        
                        {/* Signature Section */}
                        <div className="mt-8 pt-6 border-t-2 border-slate-300">
                          <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">
                            Signature & Verification
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-2">
                                  Name
                                </label>
                                <div className="border-b-2 border-slate-400 pb-2 min-h-[30px]">
                                  <span className="text-slate-800 font-medium">
                                    {typeof deptData.submittedBy === 'object' && deptData.submittedBy?.name
                                      ? deptData.submittedBy.name
                                      : typeof deptData.submittedBy === 'string'
                                        ? deptData.submittedBy
                                        : 'N/A'}
                                  </span>
                                </div>
                              </div>
                              {typeof deptData.submittedBy === 'object' && deptData.submittedBy?.designation && (
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-2">
                                    Designation
                                  </label>
                                  <div className="border-b-2 border-slate-400 pb-2 min-h-[30px]">
                                    <span className="text-slate-800 font-medium">
                                      {deptData.submittedBy.designation}
                                    </span>
                                  </div>
                                </div>
                              )}
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-2">
                                  Signature
                                </label>
                                <div className="border-b-2 border-slate-400 pb-2 min-h-[30px] flex items-end">
                                  <span className="text-slate-600 italic text-sm">
                                    {(typeof deptData.submittedBy === 'object' && deptData.submittedBy?.name) || (typeof deptData.submittedBy === 'string' && deptData.submittedBy) ? 'Signed' : 'Not available'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-2">
                                  Date
                                </label>
                                <div className="border-b-2 border-slate-400 pb-2 min-h-[30px]">
                                  <span className="text-slate-800 font-medium">
                                    {deptData.submittedAt 
                                      ? new Date(deptData.submittedAt).toLocaleDateString('en-GB', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric'
                                        })
                                      : 'N/A'}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-2">
                                  Time
                                </label>
                                <div className="border-b-2 border-slate-400 pb-2 min-h-[30px]">
                                  <span className="text-slate-800 font-medium">
                                    {deptData.submittedAt 
                                      ? new Date(deptData.submittedAt).toLocaleTimeString('en-GB', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          second: '2-digit'
                                        })
                                      : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectedIPID && !loadingPreview ? (
                <div className="text-center py-8 text-slate-500">
                  <p>No checklist data found for IPID: {selectedIPID}</p>
                </div>
              ) : !selectedIPID && admissions.length === 0 && groupsFromUHID.length === 0 && !loadingAdmissions ? (
                <div className="text-center py-8 text-slate-500">
                  <p>No admissions found for UHID: {selectedUhid}</p>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-end gap-3">
              {selectedIPID && (
                <button
                  onClick={() => {
                    setSelectedIPID(null)
                    setSelectedGroup(null)
                    setPreviewData(null)
                  }}
                  className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium px-6 py-2.5 rounded-lg text-sm transition-all"
                >
                  ← Back to List
                </button>
              )}
              <button
                onClick={() => {
                  setPreviewModalOpen(false)
                  setSelectedUhid('')
                  setSelectedDepartment(null)
                  setPreviewData(null)
                  setSelectedIPID(null)
                  setSelectedGroup(null)
                  setAdmissions([])
                  setGroupsFromUHID([])
                }}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium px-8 py-2.5 rounded-lg text-sm transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

