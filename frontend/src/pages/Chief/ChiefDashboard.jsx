import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

export function ChiefDashboard() {
  const { user } = useAuth()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [submissions, setSubmissions] = useState(null)
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [savingActions, setSavingActions] = useState({})
  
  // Corrective/Preventive state - one per submission
  const [actions, setActions] = useState({})
  // Bulk section: single corrective/preventive applied to all NO responses
  const [bulkCorrective, setBulkCorrective] = useState('')
  const [bulkPreventive, setBulkPreventive] = useState('')

  useEffect(() => {
    loadPatients()
  }, [user])

  const loadPatients = async () => {
    if (!user?.name) {
      setError('User name not found. Please log in again.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const data = await apiClient.get(`/chief/patients?chiefName=${encodeURIComponent(user.name)}`)
      setPatients(data)
    } catch (err) {
      console.error('Error loading patients:', err)
      setError(err.response?.data?.message || 'Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  const loadPatientSubmissions = async (ipid) => {
    if (!user?.name) return

    setLoadingSubmissions(true)
    setError('')
    try {
      const data = await apiClient.get(
        `/chief/patient-submissions?ipid=${encodeURIComponent(ipid)}&chiefName=${encodeURIComponent(user.name)}`
      )
      setSubmissions(data)
      setSelectedPatient(patients.find((p) => p.ipid === ipid))

      // Initialize actions state from existing data
      const initialActions = {}
      data.departments?.forEach((dept) => {
        dept.submissions?.forEach((sub) => {
          initialActions[sub._id] = {
            corrective: sub.corrective || '',
            preventive: sub.preventive || '',
          }
        })
      })
      setActions(initialActions)
      setBulkCorrective('')
      setBulkPreventive('')
    } catch (err) {
      console.error('Error loading submissions:', err)
      setError(err.response?.data?.message || 'Failed to load submissions')
    } finally {
      setLoadingSubmissions(false)
    }
  }

  const updateAction = (submissionId, field, value) => {
    setActions((prev) => ({
      ...prev,
      [submissionId]: {
        ...(prev[submissionId] || {}),
        [field]: value,
      },
    }))
  }

  const saveActions = async (submissionId) => {
    setSavingActions((prev) => ({ ...prev, [submissionId]: true }))
    try {
      const data = actions[submissionId] || {}
      await apiClient.put(`/chief/submissions/${submissionId}/corrective-preventive`, {
        corrective: data.corrective || '',
        preventive: data.preventive || '',
      })
      alert('Corrective and preventive actions saved successfully')
      // Reload submissions to get updated data
      if (selectedPatient) {
        loadPatientSubmissions(selectedPatient.ipid)
      }
    } catch (err) {
      console.error('Error saving actions:', err)
      alert('Error: ' + (err.response?.data?.message || err.message))
    } finally {
      setSavingActions((prev) => ({ ...prev, [submissionId]: false }))
    }
  }

  const bulkSaveActions = async () => {
    if (!selectedPatient) return
    // Prefer bulk section fields; else use first NO row that has data
    let corrective = (bulkCorrective || '').trim()
    let preventive = (bulkPreventive || '').trim()
    if (!corrective && !preventive) {
      const noSubmissions = []
      submissions?.departments?.forEach((dept) => {
        dept.submissions?.forEach((sub) => {
          const isNo = (sub.responseValue || sub.yesNoNa || '').toString().toUpperCase() === 'NO'
          if (isNo) noSubmissions.push(sub)
        })
      })
      if (noSubmissions.length === 0) {
        alert('No NO-response submissions for this patient. Bulk update applies only to NO responses.')
        return
      }
      const withData = noSubmissions.find(
        (s) => (actions[s._id]?.corrective || '').trim() || (actions[s._id]?.preventive || '').trim()
      )
      const source = withData || noSubmissions[0]
      const bulkData = source ? (actions[source._id] || {}) : {}
      corrective = (bulkData.corrective || '').trim()
      preventive = (bulkData.preventive || '').trim()
      if (!corrective && !preventive) {
        alert('Enter corrective and/or preventive action in the bulk fields below or in at least one NO-response row, then click Bulk Save.')
        return
      }
    }
    if (!confirm('Apply these corrective/preventive actions to ALL NO-response submissions for this patient?')) return

    setSavingActions((prev) => ({ ...prev, bulk: true }))
    try {
      await apiClient.post('/chief/submissions/bulk-corrective-preventive', {
        ipid: selectedPatient.ipid,
        chiefName: user.name,
        corrective: corrective || '',
        preventive: preventive || '',
      })
      alert('Bulk update completed successfully')
      loadPatientSubmissions(selectedPatient.ipid)
    } catch (err) {
      console.error('Error bulk saving:', err)
      alert('Error: ' + (err.response?.data?.message || err.message))
    } finally {
      setSavingActions((prev) => ({ ...prev, bulk: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-600">Loading patients...</div>
      </div>
    )
  }

  if (error && !selectedPatient) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    )
  }

  // If a patient is selected, show their submissions
  if (selectedPatient && submissions) {
    return (
      <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md border border-indigo-200/50 rounded-2xl shadow-xl px-5 py-4 sm:py-5">
        <button
          onClick={() => {
            setSelectedPatient(null)
            setSubmissions(null)
          }}
          className="mb-3 text-indigo-700 hover:text-indigo-800 text-sm font-medium"
        >
          ← Back to Patients List
        </button>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2">Corrective & Preventive Actions</h1>
        <p className="text-sm text-slate-600">Patient: {submissions.patient?.patientName} (IPID: {selectedPatient.ipid})</p>
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
          <span className="font-semibold text-slate-900">Important:</span> <span className="text-slate-700">Submitted checklist data (YES/NO responses, remarks) is <strong>read-only</strong>. You can only add/edit <strong>Corrective Actions</strong> and <strong>Preventive Actions</strong> in the fields below.</span>
        </div>
      </div>

        {/* Patient Info */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-600">UHID:</span>
              <div className="font-semibold text-slate-800">{submissions.patient?.uhid}</div>
            </div>
            <div>
              <span className="text-slate-600">Patient Name:</span>
              <div className="font-semibold text-slate-800">{submissions.patient?.patientName}</div>
            </div>
            <div>
              <span className="text-slate-600">Ward:</span>
              <div className="font-semibold text-slate-800">{submissions.admission?.ward || 'N/A'}</div>
            </div>
            <div>
              <span className="text-slate-600">Unit No:</span>
              <div className="font-semibold text-slate-800">{submissions.admission?.unitNo || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Submissions by Department */}
        {loadingSubmissions ? (
          <div className="text-center py-8 text-slate-600">Loading submissions...</div>
        ) : (
          <div className="space-y-6">
            {submissions.departments?.map((dept, deptIdx) => (
              <div key={deptIdx} className="bg-white rounded-xl shadow-sm border border-slate-200">
                {/* Department Header */}
                <div className="bg-slate-50 border-b border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {dept.department?.name} ({dept.department?.code})
                      </h3>
                      <p className="text-sm text-slate-600">{dept.submissions?.length} checklist items</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500 mb-1">Items needing actions (NO)</div>
                      <div className="text-lg font-semibold text-slate-900">
                        {(dept.submissions?.filter(s => (s.responseValue || s.yesNoNa || '').toString().toUpperCase() === 'NO').length) || 0} / {dept.submissions?.length || 0}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Filled: {dept.submissions?.filter(s => (s.responseValue || s.yesNoNa || '').toString().toUpperCase() === 'NO' && (s.corrective || s.preventive)).length || 0} / {dept.submissions?.filter(s => (s.responseValue || s.yesNoNa || '').toString().toUpperCase() === 'NO').length || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submissions Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left p-3 font-semibold text-slate-700">Checklist Item</th>
                        <th className="text-left p-3 font-semibold text-slate-700">
                          Response
                          <div className="text-xs font-normal text-slate-500 mt-0.5">Read-only</div>
                        </th>
                        <th className="text-left p-3 font-semibold text-slate-700">
                          Remarks
                          <div className="text-xs font-normal text-slate-500 mt-0.5">Read-only</div>
                        </th>
                        <th className="text-left p-3 font-semibold text-slate-700 w-1/4">
                          Corrective Action
                          <div className="text-xs font-normal text-indigo-600 mt-0.5">For NO only</div>
                        </th>
                        <th className="text-left p-3 font-semibold text-slate-700 w-1/4">
                          Preventive Action
                          <div className="text-xs font-normal text-indigo-600 mt-0.5">For NO only</div>
                        </th>
                        <th className="text-left p-3 font-semibold text-slate-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dept.submissions?.map((sub) => {
                        const isNo = (sub.responseValue || sub.yesNoNa || '').toString().toUpperCase() === 'NO'
                        return (
                        <tr key={sub._id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3">
                            <div className="font-medium text-slate-800">{sub.checklistItemId?.label}</div>
                            {sub.checklistItemId?.description && (
                              <div className="text-xs text-slate-500 mt-1">{sub.checklistItemId.description}</div>
                            )}
                          </td>
                          <td className="p-3 bg-slate-50">
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                sub.responseValue === 'YES'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : sub.responseValue === 'NO'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {sub.responseValue || 'N/A'}
                            </span>
                          </td>
                          <td className="p-3 bg-slate-50">
                            <span className="text-slate-600 text-sm">{sub.remarks || '—'}</span>
                          </td>
                          <td className="p-3">
                            {isNo ? (
                              <textarea
                                value={actions[sub._id]?.corrective || ''}
                                onChange={(e) => updateAction(sub._id, 'corrective', e.target.value)}
                                className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                rows="2"
                                placeholder="Enter corrective action"
                              />
                            ) : (
                              <span className="text-slate-400 italic text-sm">N/A</span>
                            )}
                          </td>
                          <td className="p-3">
                            {isNo ? (
                              <textarea
                                value={actions[sub._id]?.preventive || ''}
                                onChange={(e) => updateAction(sub._id, 'preventive', e.target.value)}
                                className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                rows="2"
                                placeholder="Enter preventive action"
                              />
                            ) : (
                              <span className="text-slate-400 italic text-sm">N/A</span>
                            )}
                          </td>
                          <td className="p-3">
                            {isNo ? (
                              <>
                                <button
                                  onClick={() => saveActions(sub._id)}
                                  disabled={savingActions[sub._id]}
                                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:bg-slate-400 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                                >
                                  {savingActions[sub._id] ? 'Saving...' : 'Save'}
                                </button>
                                {sub.correctivePreventiveAt && (
                                  <div className="text-xs text-slate-500 mt-1">
                                    Updated: {new Date(sub.correctivePreventiveAt).toLocaleDateString()}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bulk Actions */}
        <div className="bg-indigo-50 rounded-lg border border-indigo-200 p-4">
          <h4 className="font-semibold text-slate-900 mb-2">
            Bulk Update (NO responses only)
          </h4>
          <p className="text-sm text-slate-700 mb-3">
            Enter corrective and preventive actions below (or in any NO-response row above), then click <strong>Bulk Save</strong> to apply to all NO-response submissions for this patient.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Corrective Action (applies to all NO)</label>
              <textarea
                value={bulkCorrective}
                onChange={(e) => setBulkCorrective(e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows="3"
                placeholder="Enter corrective action for all NO items"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Preventive Action (applies to all NO)</label>
              <textarea
                value={bulkPreventive}
                onChange={(e) => setBulkPreventive(e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows="3"
                placeholder="Enter preventive action for all NO items"
              />
            </div>
          </div>
          <div className="bg-white/95 backdrop-blur-md rounded-xl p-3 mb-3 border border-slate-200">
            <p className="text-xs text-slate-800 font-medium mb-1">How it works:</p>
            <ol className="text-xs text-slate-600 list-decimal list-inside space-y-1">
              <li>Fill the bulk fields above and/or any NO-response row</li>
              <li>Click &quot;Bulk Save&quot; below</li>
              <li>Same actions are applied to all NO-response submissions for this patient</li>
              <li>Auditors are notified automatically</li>
            </ol>
          </div>
          <button
            onClick={bulkSaveActions}
            disabled={savingActions.bulk}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:bg-slate-400 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-sm"
          >
            {savingActions.bulk ? 'Saving...' : 'Bulk Save All Submissions'}
          </button>
        </div>
      </div>
    )
  }

  // Default view: List of patients
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md border border-indigo-200/50 rounded-2xl shadow-xl px-5 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Chief/HOD Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">Welcome, {user?.name}</p>
            <p className="text-xs text-slate-500 mt-1">
              Department: <span className="font-medium">{user?.department?.name || 'N/A'}</span>
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-100">
            CHIEF ROLE
          </span>
        </div>
      </div>

      {/* Patients List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
                      <h3 className="text-lg font-semibold text-slate-900">Your Patients ({patients.length})</h3>
                      <p className="text-sm text-slate-600 mt-1">Click on a patient to view and add corrective/preventive actions</p>
                    </div>
                    {patients.length > 0 && (
                      <div className="text-right">
                        <div className="text-xs text-slate-500 mb-1">Pending Actions</div>
                        <div className="text-2xl font-bold text-amber-600">
                          {patients.filter(p => p.submissionsWithActions === 0).length}
                        </div>
                      </div>
                    )}
          </div>
        </div>

        {patients.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-slate-700 font-semibold mb-2">No patients assigned yet</p>
            <p className="text-slate-600 text-sm mb-4">
              Patients will appear here when auditors submit forms with your name as <strong>Unit Chief</strong>.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto text-left">
              <p className="text-xs text-blue-800 font-semibold mb-2">💡 How to get patients assigned:</p>
              <ol className="text-xs text-blue-700 list-decimal list-inside space-y-1">
                <li>Auditors select your name from the "Unit Chief" dropdown when submitting forms</li>
                <li>Once a form is submitted with your name, the patient will appear here</li>
                <li>You can then add corrective/preventive actions for review</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">IPID</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">UHID</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Patient Name</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Ward</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Unit</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Departments</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Submissions</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.ipid} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-800">{patient.ipid}</td>
                    <td className="p-3 text-slate-600">{patient.uhid}</td>
                    <td className="p-3 font-medium text-slate-800">{patient.patientName}</td>
                    <td className="p-3 text-slate-600">{patient.ward || 'N/A'}</td>
                    <td className="p-3 text-slate-600">{patient.unitNo || 'N/A'}</td>
                    <td className="p-3 text-slate-600 text-xs">
                      {patient.departments?.join(', ') || 'N/A'}
                    </td>
                    <td className="p-3 text-slate-600">{patient.totalSubmissions}</td>
                    <td className="p-3">
                      {patient.submissionsWithActions > 0 ? (
                        <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {patient.submissionsWithActions}/{patient.totalSubmissions} completed
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => loadPatientSubmissions(patient.ipid)}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                      >
                        View & Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
