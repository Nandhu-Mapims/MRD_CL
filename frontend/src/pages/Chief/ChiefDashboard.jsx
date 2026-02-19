import { useState, useEffect, Fragment } from 'react'
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
  const [showSaveSuccessPopup, setShowSaveSuccessPopup] = useState(false)
  // When set, we're viewing one specific form submission (card); null = show cards list
  const [selectedCard, setSelectedCard] = useState(null)
  const [validationMessage, setValidationMessage] = useState('')
  const [saveError, setSaveError] = useState('')

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
    if (!user?.name) return null

    setLoadingSubmissions(true)
    setError('')
    try {
      const data = await apiClient.get(
        `/chief/patient-submissions?ipid=${encodeURIComponent(ipid)}&chiefName=${encodeURIComponent(user.name)}`
      )
      setSubmissions(data)
      // Use patient from API when available to avoid stale closure over patients list
      const patientFromApi = data?.patient
      setSelectedPatient(
        patientFromApi ? { ipid, ...patientFromApi } : patients.find((p) => p.ipid === ipid)
      )
      setSelectedCard(null)

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
      return data
    } catch (err) {
      console.error('Error loading submissions:', err)
      setError(err.response?.data?.message || 'Failed to load submissions')
      return null
    } finally {
      setLoadingSubmissions(false)
    }
  }

  /** Returns true if every submission with response NO has at least corrective or preventive filled */
  const allCorrectivePreventiveCompleted = (data) => {
    if (!data?.departments) return false
    let totalNo = 0
    let filledNo = 0
    data.departments.forEach((dept) => {
      dept.submissions?.forEach((sub) => {
        const isNo = (sub.responseValue || sub.yesNoNa || '').toString().toUpperCase() === 'NO'
        if (isNo) {
          totalNo += 1
          if ((sub.corrective || '').trim() || (sub.preventive || '').trim()) filledNo += 1
        }
      })
    })
    return totalNo > 0 && totalNo === filledNo
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
    setValidationMessage('')
    setSaveError('')
    const data = actions[submissionId] || {}
    const corrective = (data.corrective || '').trim()
    const preventive = (data.preventive || '').trim()
    if (!corrective || !preventive) {
      if (!corrective && !preventive) {
        setValidationMessage('Both Corrective Action and Preventive Action are required. Please fill both fields before saving.')
      } else if (!corrective) {
        setValidationMessage('Corrective Action is required. Please enter a value before saving.')
      } else {
        setValidationMessage('Preventive Action is required. Please enter a value before saving.')
      }
      return
    }

    setSavingActions((prev) => ({ ...prev, [submissionId]: true }))
    try {
      await apiClient.put(`/chief/submissions/${submissionId}/corrective-preventive`, {
        corrective,
        preventive,
      })
      setValidationMessage('')
      if (selectedPatient) {
        const updated = await loadPatientSubmissions(selectedPatient.ipid)
        if (updated && allCorrectivePreventiveCompleted(updated)) {
          setShowSaveSuccessPopup(true)
        }
      }
    } catch (err) {
      console.error('Error saving actions:', err)
      setSaveError(err.response?.data?.message || err.message || 'Failed to save')
    } finally {
      setSavingActions((prev) => ({ ...prev, [submissionId]: false }))
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
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md">
        <p className="text-red-700 font-medium">{error}</p>
        <button
          type="button"
          onClick={() => { setError(''); loadPatients() }}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  // If a patient is selected, show their submissions
  if (selectedPatient && submissions) {
    return (
      <div className="space-y-6 min-w-0 relative">
      {/* Success popup when corrective/preventive actions are saved */}
      {showSaveSuccessPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => {
            setShowSaveSuccessPopup(false)
            setSelectedPatient(null)
            setSubmissions(null)
            setSelectedCard(null)
            loadPatients()
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center border border-emerald-200" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Completed</h3>
            <p className="text-sm text-slate-600 mb-6">All corrective and preventive actions for this patient have been completed and saved.</p>
            <button
              onClick={() => {
                setShowSaveSuccessPopup(false)
                setSelectedPatient(null)
                setSubmissions(null)
                setSelectedCard(null)
                loadPatients()
              }}
              className="w-full py-2.5 px-4 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md border border-indigo-200/50 rounded-2xl shadow-xl px-5 py-4 sm:py-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              if (selectedCard) {
                setSelectedCard(null)
              } else {
                setSelectedPatient(null)
                setSubmissions(null)
              }
              setShowSaveSuccessPopup(false)
              setValidationMessage('')
              setSaveError('')
            }}
            className="text-indigo-700 hover:text-indigo-800 text-sm font-medium"
          >
            ← {selectedCard ? 'Back to Submissions' : 'Back to Patients List'}
          </button>
          <span className="text-slate-400 text-sm">
            {selectedCard ? `Chief Dashboard → IPID ${selectedPatient.ipid} → ${selectedCard.label}` : `Chief Dashboard → Patient IPID ${selectedPatient.ipid}`}
          </span>
        </div>

        {/* Cards view: IPID + Ward + Unit, then cards per audit submission */}
        {!selectedCard ? (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-2xl font-bold text-indigo-600">IPID: {selectedPatient.ipid}</span>
                <span className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                  Ward: {submissions.admission?.ward || 'N/A'}
                </span>
                <span className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                  Unit: {submissions.admission?.unitNo || 'N/A'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(() => {
                const cards = []
                submissions.departments?.forEach((dept) => {
                  const deptId = dept.department?._id?.toString()
                  const deptName = dept.department?.name || dept.department?.code || 'Unknown'
                  const deptCode = dept.department?.code || ''
                  const subs = dept.submissions || []
                  const byKey = new Map()
                  subs.forEach((sub) => {
                    const t = sub.submittedAt ? new Date(sub.submittedAt).getTime() : 0
                    const rounded = Math.floor(t / 60000) * 60000
                    const key = `${sub.formTemplate || 'none'}_${rounded}`
                    if (!byKey.has(key)) {
                      byKey.set(key, { submittedAt: sub.submittedAt, submissions: [] })
                    }
                    byKey.get(key).submissions.push(sub)
                  })
                  byKey.forEach((val, key) => {
                    cards.push({
                      departmentId: deptId,
                      departmentName: deptName,
                      departmentCode: deptCode,
                      label: deptCode ? `${deptCode}` : deptName,
                      submittedAt: val.submittedAt,
                      submissions: val.submissions,
                    })
                  })
                })
                cards.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
                return cards.map((card, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { setValidationMessage(''); setSaveError(''); setSelectedCard(card) }}
                    className="flex items-center justify-between w-full text-left bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-indigo-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{card.label}</div>
                        <div className="text-sm text-slate-500 mt-0.5">
                          {card.submittedAt ? new Date(card.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} – {card.submittedAt ? new Date(card.submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </div>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-slate-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))
              })()}
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2">Corrective & Preventive Actions</h1>
            <p className="text-sm text-slate-600">
              Patient: {submissions.patient?.patientName} (IPID: {selectedPatient.ipid}) · {selectedCard.label}
              {(() => {
                const auditor = selectedCard.submissions?.find(s => s.submittedBy && (s.submittedBy.name || s.submittedBy.email))?.submittedBy
                const auditorLabel = auditor ? (auditor.name || auditor.email || '—') : '—'
                return <> · <span className="font-medium text-indigo-700">Audited by: {auditorLabel}</span></>
              })()}
            </p>
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              <span className="font-semibold text-slate-900">Important:</span> <span className="text-slate-700">Submitted checklist data (YES/NO responses, remarks) is <strong>read-only</strong>. You can only add/edit <strong>Corrective Actions</strong> and <strong>Preventive Actions</strong> per row below, then click <strong>Save</strong> for each item.</span>
            </div>
            {validationMessage && (
              <div className="mt-3 bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm text-amber-800" role="alert">
                {validationMessage}
              </div>
            )}
            {saveError && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 flex items-center justify-between gap-2" role="alert">
                <span>{saveError}</span>
                <button type="button" onClick={() => setSaveError('')} className="text-red-600 hover:text-red-800 underline text-xs">Dismiss</button>
              </div>
            )}

            {/* Who audited this – prominent block */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
              <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Who audited this</div>
              <div className="text-base font-semibold text-slate-900">
                {(() => {
                  const auditor = selectedCard?.submissions?.find(s => s.submittedBy && (typeof s.submittedBy === 'object' && (s.submittedBy.name || s.submittedBy.email)))?.submittedBy
                  if (!auditor || typeof auditor !== 'object') return <span className="text-slate-500 italic">Not recorded</span>
                  const name = auditor.name || auditor.email || 'Not recorded'
                  const parts = [name]
                  if (auditor.designation) parts.push(auditor.designation)
                  if (auditor.email && auditor.name) parts.push(auditor.email)
                  return <span>{parts.join(' · ')}</span>
                })()}
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

            {/* Single form submission detail (filtered by selectedCard) */}
        {loadingSubmissions ? (
          <div className="text-center py-8 text-slate-600">Loading submissions...</div>
        ) : (
          <div className="space-y-6">
            {selectedCard && (() => {
              const dept = {
                department: { _id: selectedCard.departmentId, name: selectedCard.departmentName, code: selectedCard.departmentCode },
                submissions: selectedCard.submissions,
              }
              return (
              <div key={selectedCard.departmentId} className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="bg-slate-50 border-b border-slate-200 p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {dept.department?.name} ({dept.department?.code})
                      </h3>
                      <p className="text-sm text-slate-600">{dept.submissions?.length} checklist items</p>
                      {(() => {
                        const auditor = dept.submissions?.find(s => s.submittedBy && (s.submittedBy.name || s.submittedBy.email))?.submittedBy
                        if (!auditor) return <p className="text-sm text-slate-500 mt-1">Audited by: —</p>
                        const name = auditor.name || auditor.email || '—'
                        const extra = auditor.designation ? ` · ${auditor.designation}` : (auditor.email && auditor.name ? ` · ${auditor.email}` : '')
                        return <p className="text-sm text-indigo-700 mt-1"><span className="font-medium">Audited by:</span> {name}{extra}</p>
                      })()}
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

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left p-3 font-semibold text-slate-700 w-12">#</th>
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
                      {(() => {
                        const subs = dept.submissions || []
                        const sectionMap = new Map()
                        subs.forEach((sub) => {
                          const sectionName = sub.checklistItemId?.section?.trim() || 'General'
                          if (!sectionMap.has(sectionName)) {
                            sectionMap.set(sectionName, [])
                          }
                          sectionMap.get(sectionName).push(sub)
                        })
                        const sections = Array.from(sectionMap.entries())
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([sectionName, items]) => ({
                            sectionName,
                            items: [...items].sort((a, b) => (a.checklistItemId?.order ?? 0) - (b.checklistItemId?.order ?? 0)),
                          }))
                        let rowIndex = 0
                        return sections.map((section) => (
                          <Fragment key={section.sectionName}>
                            <tr className="bg-slate-100 border-y border-slate-200" style={{ pageBreakAfter: 'avoid' }}>
                              <td colSpan={7} className="p-2 pl-3 font-semibold text-slate-800 text-sm">
                                {section.sectionName}
                              </td>
                            </tr>
                            {section.items.map((sub) => {
                              const isNo = (sub.responseValue || sub.yesNoNa || '').toString().toUpperCase() === 'NO'
                              rowIndex += 1
                              return (
                                <tr key={sub._id} className="border-b border-slate-100 hover:bg-slate-50">
                                  <td className="p-3 text-slate-500 font-medium">{rowIndex}</td>
                                  <td className="p-3">
                                    <div className="font-medium text-slate-800">{sub.checklistItemId?.label}</div>
                                    {sub.checklistItemId?.description && (
                                      <div className="text-xs text-slate-500 mt-1">{sub.checklistItemId.description}</div>
                                    )}
                                  </td>
                                  <td className="p-3 bg-slate-50">
                                    {(() => {
                                      const v = (sub.responseValue || sub.yesNoNa || '').toString().trim().toUpperCase()
                                      const isNa = v === 'N/A' || v === 'NA'
                                      return (
                                        <span
                                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                            sub.responseValue === 'YES'
                                              ? 'bg-emerald-50 text-emerald-700'
                                              : sub.responseValue === 'NO'
                                              ? 'bg-red-50 text-red-700'
                                              : isNa
                                              ? 'bg-slate-100 text-slate-600'
                                              : 'bg-slate-100 text-slate-700'
                                          }`}
                                        >
                                          {sub.responseValue === 'YES' ? 'YES' : sub.responseValue === 'NO' ? 'NO' : isNa ? 'N/A' : (sub.responseValue || sub.yesNoNa) || '—'}
                                        </span>
                                      )
                                    })()}
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
                          </Fragment>
                        ))
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
              )
            })()}
          </div>
        )}
          </>
        )}
      </div>
      </div>
    )
  }

  // Default view: List of patients
  return (
    <div className="space-y-6 min-w-0">
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
                        <div className="text-xs text-slate-500 mb-1">Patients needing your action</div>
                        <div className="text-2xl font-bold text-amber-600">
                          {patients.filter(p => {
                            const noCount = p.noCount ?? 0
                            const noWithActions = p.noWithActions ?? 0
                            return noCount > 0 && noWithActions < noCount
                          }).length}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">NO items without corrective/preventive</div>
                      </div>
                    )}
          </div>
        </div>

        {patients.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-slate-700 font-semibold mb-2">No patients assigned yet</p>
            <p className="text-slate-600 text-sm mb-2">
              Only patients where <strong>your name</strong> was selected as Unit Chief appear here.
            </p>
            <p className="text-slate-500 text-xs mb-4">
              If you expect to see data, ask auditors to choose your name in the <strong>Unit Chief</strong> field when submitting.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto text-left">
              <p className="text-xs text-blue-800 font-semibold mb-2">💡 How to get patients assigned:</p>
              <ol className="text-xs text-blue-700 list-decimal list-inside space-y-1">
                <li>Auditors select your name from the &quot;Unit Chief&quot; dropdown when submitting forms</li>
                <li>Once a form is submitted with your name, the patient will appear here</li>
                <li>You can then add corrective/preventive actions for review</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto min-w-max">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700 whitespace-nowrap w-12">#</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700 whitespace-nowrap">IPID</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700 whitespace-nowrap">UHID</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700 whitespace-nowrap">Patient Name</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700 whitespace-nowrap">Ward</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700 whitespace-nowrap">Unit</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700 whitespace-nowrap">Departments</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700 whitespace-nowrap">Submissions</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700 whitespace-nowrap">No's</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700 whitespace-nowrap">Status</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient, idx) => (
                  <tr key={patient.ipid} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 text-slate-500 font-medium whitespace-nowrap">{idx + 1}</td>
                    <td className="p-3 font-medium text-slate-800 whitespace-nowrap">{patient.ipid}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{patient.uhid}</td>
                    <td className="p-3 font-medium text-slate-800 whitespace-nowrap">{patient.patientName}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{patient.ward || 'N/A'}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{patient.unitNo || 'N/A'}</td>
                    <td className="p-3 text-slate-600 text-xs whitespace-nowrap">
                      {patient.departments?.join(', ') || 'N/A'}
                    </td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{patient.totalSubmissions}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{patient.noCount ?? 0}</td>
                    <td className="p-3 whitespace-nowrap">
                      {(() => {
                        const noCount = patient.noCount ?? 0
                        const noWithActions = patient.noWithActions ?? 0
                        if (noCount === 0) {
                          return (
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Completed
                            </span>
                          )
                        }
                        if (noWithActions === noCount) {
                          return (
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Completed
                            </span>
                          )
                        }
                        if (noWithActions > 0) {
                          return (
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              {noWithActions}/{noCount} completed
                            </span>
                          )
                        }
                        return (
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )
                      })()}
                    </td>
                    <td className="p-3 whitespace-nowrap">
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
