import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

export function DepartmentLogs() {
  const [logs, setLogs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedDepts, setExpandedDepts] = useState(new Set())
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [selectedUhid, setSelectedUhid] = useState('')
  const [previewData, setPreviewData] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      setError(null)
      const data = await apiClient.get('/departments/logs')
      setLogs(data)
      // Auto-expand if there's only one department (for regular users)
      if (data.departments && data.departments.length === 1) {
        setExpandedDepts(new Set([data.departments[0].department._id]))
      }
    } catch (err) {
      console.error('Error loading department logs', err)
      setError(err.response?.data?.message || err.message || 'Failed to load department logs')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (deptId) => {
    const newExpanded = new Set(expandedDepts)
    if (newExpanded.has(deptId)) {
      newExpanded.delete(deptId)
    } else {
      newExpanded.add(deptId)
    }
    setExpandedDepts(newExpanded)
  }

  const loadPreviewData = async (uhid) => {
    if (!uhid || !uhid.trim()) return
    
    setLoadingPreview(true)
    setPreviewModalOpen(true)
    setSelectedUhid(uhid.trim().toUpperCase())
    setPreviewData(null) // Clear previous data
    
    try {
      // Get all submissions for this UHID grouped by department
      const submissions = await apiClient.get(`/audits/uhid/${encodeURIComponent(uhid.trim().toUpperCase())}`)
      
      if (!submissions || submissions.length === 0) {
        setPreviewData({
          patient: { uhid: uhid.trim().toUpperCase(), patientName: 'N/A' },
          departments: []
        })
        return
      }

      // Transform flat array of submissions into structured format
      const patient = submissions[0]?.patient || { 
        uhid: uhid.trim().toUpperCase(), 
        patientName: submissions[0]?.patientName || 'N/A' 
      }

      // Group submissions by department and section
      const deptMap = new Map()
      
      submissions.forEach(sub => {
        const deptId = sub.department?._id || sub.department
        const deptName = sub.department?.name || 'Unknown Department'
        const deptCode = sub.department?.code || 'N/A'
        
        if (!deptMap.has(deptId)) {
          deptMap.set(deptId, {
            department: { _id: deptId, name: deptName, code: deptCode },
            sections: new Map()
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
            label: sub.checklistItemId?.label || 'N/A'
          },
          responseValue: sub.responseValue || sub.yesNoNa || 'N/A',
          remarks: sub.remarks || '-',
          responsibility: sub.responsibility || '-',
        })
      })
      
      // Convert Maps to arrays
      const departments = Array.from(deptMap.values()).map(dept => ({
        department: dept.department,
        sections: Array.from(dept.sections.values())
      }))
      
      setPreviewData({
        patient,
        departments
      })
    } catch (err) {
      console.error('Error loading preview data:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load data'
      setPreviewData({ 
        error: errorMessage,
        patient: { uhid: uhid.trim().toUpperCase(), patientName: 'N/A' },
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
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-xl p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Department Activity Logs</h2>
          <p className="text-blue-100">Track form submissions and edits across all departments</p>
        </div>
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-blue-800 font-semibold mb-2">Error Loading Department Logs</p>
          <p className="text-blue-600 text-sm mb-4">{error}</p>
          <button
            onClick={loadLogs}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
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
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-xl p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Department Activity Logs</h2>
          <p className="text-blue-100">Track form submissions and edits across all departments</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-dashed border-slate-300">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-slate-600 text-lg font-medium mb-2">No department activity yet</p>
          <p className="text-sm text-slate-500">
            Start submitting forms to see activity logs here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white rounded-xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-5"></div>
        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 drop-shadow-lg">
            Department Activity Logs
          </h2>
          <p className="text-blue-100 text-sm sm:text-base">
            Track form submissions, submission dates, and recent edits for all departments
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg p-6 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600 mb-1 font-medium uppercase tracking-wide">
                Total Departments
              </p>
              <p className="text-3xl font-bold text-blue-600">{logs.totalDepartments}</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🏢</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-green-50 rounded-xl shadow-lg p-6 border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600 mb-1 font-medium uppercase tracking-wide">
                Total Forms Submitted
              </p>
              <p className="text-3xl font-bold text-green-600">
                {logs.departments.reduce((sum, dept) => sum + dept.totalFormsSubmitted, 0)}
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">📝</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-orange-50 rounded-xl shadow-lg p-6 border border-orange-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600 mb-1 font-medium uppercase tracking-wide">
                Recently Edited
              </p>
              <p className="text-3xl font-bold text-orange-600">
                {logs.departments.reduce((sum, dept) => sum + dept.recentlyEditedCount, 0)}
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">✏️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Department Logs */}
      <div className="space-y-4">
        {logs.departments.map((deptLog) => {
          const isExpanded = expandedDepts.has(deptLog.department._id)
          const isSingleDepartment = logs.departments.length === 1
          return (
            <div
              key={deptLog.department._id}
              className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden"
            >
              {/* Department Header */}
              <div
                className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 sm:p-6 cursor-pointer hover:from-blue-100 hover:to-blue-200 transition-colors"
                onClick={() => toggleExpand(deptLog.department._id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-800">
                        {deptLog.department.name}
                      </h3>
                      <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                        {deptLog.department.code}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-slate-600">Forms Submitted:</span>
                        <span className="ml-2 font-bold text-slate-800">
                          {deptLog.totalFormsSubmitted}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600">Total Submissions:</span>
                        <span className="ml-2 font-bold text-slate-800">
                          {deptLog.totalSubmissions}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600">Recently Edited:</span>
                        <span className="ml-2 font-bold text-orange-600">
                          {deptLog.recentlyEditedCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600">Last Submission:</span>
                        <span className="ml-2 font-semibold text-slate-700">
                          {deptLog.latestSubmissionDate
                            ? getTimeAgo(deptLog.latestSubmissionDate)
                            : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    <button className="text-slate-600 hover:text-slate-800 transition-colors">
                      {isExpanded ? (
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {(isExpanded || isSingleDepartment) && (
                <div className="p-4 sm:p-6 border-t border-slate-200 space-y-6">
                  {/* Patient-Based View (Primary for single department) */}
                  {deptLog.patients && deptLog.patients.length > 0 && (
                    <div>
                      <h4 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <span>👤</span> Forms by Patient ID (UHID) - {deptLog.patients.length} Patient{deptLog.patients.length !== 1 ? 's' : ''}
                      </h4>
                      <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                        <div className="space-y-3">
                          {deptLog.patients.map((patient, idx) => (
                            <div
                              key={idx}
                              className="bg-white p-4 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        loadPreviewData(patient.uhid)
                                      }}
                                      className="font-bold text-lg text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                    >
                                      UHID: {patient.uhid}
                                    </button>
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                                      {patient.submissionCount} submission{patient.submissionCount !== 1 ? 's' : ''}
                                    </span>
                                    {patient.editedCount > 0 && (
                                      <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
                                        {patient.editedCount} edited
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-600 mb-2">
                                    <span className="font-medium">Patient Name:</span> {patient.patientName}
                                  </p>
                                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                                    <div>
                                      <span className="font-medium">First Submission:</span>{' '}
                                      {formatDate(patient.firstSubmission)}
                                    </div>
                                    <div>
                                      <span className="font-medium">Last Submission:</span>{' '}
                                      {formatDate(patient.lastSubmission)} ({getTimeAgo(patient.lastSubmission)})
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submission Dates Timeline */}
                  {deptLog.submissionDates && deptLog.submissionDates.length > 0 && (
                    <div>
                      <h4 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <span>📅</span> Submission Timeline (Last 30 Days)
                      </h4>
                      <div className="bg-slate-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                        <div className="space-y-2">
                          {deptLog.submissionDates.map((dateEntry, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                <span className="font-medium text-slate-700">
                                  {formatDateOnly(dateEntry.date)}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-slate-600">
                                  {dateEntry.uniqueForms} form{dateEntry.uniqueForms !== 1 ? 's' : ''}
                                </span>
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                                  {dateEntry.count} submission{dateEntry.count !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recently Edited Forms */}
                  {deptLog.recentlyEdited && deptLog.recentlyEdited.length > 0 && (
                    <div>
                      <h4 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <span>✏️</span> Recently Edited Forms
                      </h4>
                      <div className="bg-orange-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                        <div className="space-y-2">
                          {deptLog.recentlyEdited.map((edited, idx) => (
                            <div
                              key={idx}
                              className="bg-white p-4 rounded-lg border border-orange-200 hover:border-orange-400 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        loadPreviewData(edited.uhid)
                                      }}
                                      className="font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                    >
                                      UHID: {edited.uhid}
                                    </button>
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
                                      EDITED
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-600">
                                    Patient: {edited.patientName}
                                  </p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-2 pt-2 border-t border-slate-200">
                                <div>
                                  <span className="font-medium">Submitted:</span>{' '}
                                  {formatDate(edited.submittedAt)}
                                </div>
                                <div>
                                  <span className="font-medium">Edited:</span>{' '}
                                  {formatDate(edited.editedAt)} ({getTimeAgo(edited.editedAt)})
                                </div>
                                <div>
                                  <span className="font-medium">By:</span> {edited.submittedBy}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* All Recent Submissions */}
                  {deptLog.allSubmissions && deptLog.allSubmissions.length > 0 && (
                    <div>
                      <h4 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <span>📋</span> Recent Submissions (Last 100)
                      </h4>
                      <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-200 text-left">
                                <th className="px-3 py-2 font-semibold text-slate-700">UHID</th>
                                <th className="px-3 py-2 font-semibold text-slate-700">
                                  Patient Name
                                </th>
                                <th className="px-3 py-2 font-semibold text-slate-700">
                                  Submitted At
                                </th>
                                <th className="px-3 py-2 font-semibold text-slate-700">By</th>
                              </tr>
                            </thead>
                            <tbody>
                              {deptLog.allSubmissions.map((sub, idx) => (
                                <tr
                                  key={idx}
                                  className="border-b border-slate-200 hover:bg-white transition-colors"
                                >
                                  <td className="px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        loadPreviewData(sub.uhid)
                                      }}
                                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                    >
                                      {sub.uhid}
                                    </button>
                                  </td>
                                  <td className="px-3 py-2 text-slate-600">{sub.patientName}</td>
                                  <td className="px-3 py-2 text-slate-600">
                                    {formatDate(sub.submittedAt)}
                                  </td>
                                  <td className="px-3 py-2">
                                    {sub.isEdited ? (
                                      <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
                                        Edited
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                                        New
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-slate-600 text-xs">
                                    {sub.submittedBy}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {deptLog.totalSubmissions === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <div className="text-4xl mb-2">📭</div>
                      <p>No submissions found for this department</p>
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
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between shadow-lg">
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
                  <span>📋</span>
                  Data Preview - UHID: <span className="font-mono">{selectedUhid}</span>
                </h2>
                <p className="text-sm text-blue-100 flex items-center gap-2">
                  {previewData?.patient?.patientName ? (
                    <>
                      <span>👤</span>
                      <span className="font-medium">Patient: {previewData.patient.patientName}</span>
                    </>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="inline-block animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></span>
                      Loading...
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setPreviewModalOpen(false)
                  setSelectedUhid('')
                  setPreviewData(null)
                }}
                className="ml-4 text-white hover:text-blue-200 hover:bg-blue-700 rounded-full p-2 transition-colors text-2xl font-bold w-10 h-10 flex items-center justify-center"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingPreview ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                  <div className="text-slate-500 font-medium">Loading data...</div>
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
                        {deptData.sections && deptData.sections.length > 0 ? (
                          deptData.sections.map((section, sectionIdx) => (
                            <div key={sectionIdx} className={sectionIdx > 0 ? "mt-6 pt-6 border-t border-slate-200" : ""}>
                              <h4 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wide border-b-2 border-blue-200 pb-2">
                                {section.sectionName}
                              </h4>
                              <div className="overflow-x-auto -mx-4 px-4">
                                <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
                                  <thead className="bg-slate-100">
                                    <tr>
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
                                        Responsibility
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {section.items.map((item, itemIdx) => (
                                      <tr key={itemIdx} className="hover:bg-slate-50 transition-colors">
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
                                            {item.responsibility && item.responsibility !== '-' ? item.responsibility : (
                                              <span className="text-slate-400 italic">-</span>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-500 text-sm">No data available for this department.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>No data found for UHID: {selectedUhid}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-end">
              <button
                onClick={() => {
                  setPreviewModalOpen(false)
                  setSelectedUhid('')
                  setPreviewData(null)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-2.5 rounded-lg text-sm transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02]"
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

