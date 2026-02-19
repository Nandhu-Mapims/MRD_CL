import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'

export function AuditorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [recentSubmissions, setRecentSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [userForms, setUserForms] = useState([])

  useEffect(() => {
    loadDashboardData()
    loadUserForms()
  }, [user])

  const loadUserForms = async () => {
    try {
      const forms = await apiClient.get('/form-templates/accessible/list')
      setUserForms(forms || [])
    } catch (err) {
      console.error('Error loading user forms:', err)
      setUserForms([])
    }
  }

  const loadDashboardData = async () => {
    if (!user?._id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const allSubmissions = await apiClient.get(`/audits?submittedBy=${user._id}`)

      const totalSubmissions = allSubmissions.length
      const uniquePatients = new Set(allSubmissions.map(s => s.uhid)).size
      const recentCount = allSubmissions.filter(s => {
        const days = (Date.now() - new Date(s.submittedAt)) / (1000 * 60 * 60 * 24)
        return days <= 7
      }).length

      setStats({
        totalSubmissions,
        uniquePatients,
        recentSubmissions: recentCount,
        department: user?.department?.name || 'N/A',
      })

      setRecentSubmissions(allSubmissions.slice(0, 5))
    } catch (err) {
      console.error('Error loading dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-600">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Auditor Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">Welcome, {user?.name}</p>
            {stats?.department && (
              <p className="text-xs text-slate-500 mt-1">
                Department: <span className="font-medium">{stats.department}</span>
              </p>
            )}
          </div>
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-100">
            AUDITOR ROLE
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Submissions</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats?.totalSubmissions || 0}</p>
            </div>
            <div className="bg-indigo-50 p-3 rounded-full">
              <svg className="w-6 h-6 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Patients Reviewed</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats?.uniquePatients || 0}</p>
            </div>
            <div className="bg-slate-100 p-3 rounded-full">
              <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Last 7 Days</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats?.recentSubmissions || 0}</p>
            </div>
            <div className="bg-slate-100 p-3 rounded-full">
              <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">Recent Submissions</h3>
        </div>
        {recentSubmissions.length === 0 ? (
          <div className="p-8 text-center text-slate-600">
            No submissions yet. Start by filling out a checklist.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-700 w-12">#</th>
                  <th className="text-left p-3 font-semibold text-slate-700">Date</th>
                  <th className="text-left p-3 font-semibold text-slate-700">UHID</th>
                  <th className="text-left p-3 font-semibold text-slate-700">IPID</th>
                  <th className="text-left p-3 font-semibold text-slate-700">Patient Name</th>
                  <th className="text-left p-3 font-semibold text-slate-700">Department</th>
                  <th className="text-left p-3 font-semibold text-slate-700">Checklist Item</th>
                  <th className="text-left p-3 font-semibold text-slate-700">Response</th>
                </tr>
              </thead>
              <tbody>
                {recentSubmissions.map((sub, idx) => (
                  <tr key={sub._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 text-slate-500 font-medium">{idx + 1}</td>
                    <td className="p-3 text-slate-600">
                      {new Date(sub.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 font-medium text-slate-800">{sub.uhid}</td>
                    <td className="p-3 text-slate-600">{sub.ipid}</td>
                    <td className="p-3 font-medium text-slate-800">{sub.patientName}</td>
                    <td className="p-3 text-slate-600">{sub.department?.name}</td>
                    <td className="p-3 text-slate-600">{sub.checklistItemId?.label || 'N/A'}</td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          sub.responseValue === 'YES'
                            ? 'bg-green-100 text-green-800'
                            : sub.responseValue === 'NO'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {sub.responseValue || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Quick Actions</h3>
        <p className="text-sm text-slate-600 mb-4">Access your forms and reports</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {userForms && userForms.length > 0 ? (
            userForms.slice(0, 2).map((form) => (
              <Link
                key={form._id}
                to={`/form/${form._id}`}
                className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 hover:border-indigo-300 transition-all shadow-sm"
              >
                <svg className="w-8 h-8 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">Submit Form</div>
                  <div className="text-sm text-indigo-700 font-medium">{form.name}</div>
                  <div className="text-xs text-slate-600 mt-1">Click to fill checklist</div>
                </div>
                <span className="text-indigo-700">→</span>
              </Link>
            ))
          ) : (
            <div className="col-span-full p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">No forms assigned yet.</span> Contact your administrator to get access to forms.
              </p>
            </div>
          )}
          <Link
            to="/admin/patient-report"
            className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm"
          >
            <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="flex-1">
              <div className="font-semibold text-slate-900">Patient Reports</div>
              <div className="text-sm text-slate-600">View detailed checklists</div>
            </div>
            <span className="text-slate-700">→</span>
          </Link>
          <Link
            to="/admin/department-logs"
            className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm"
          >
            <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div className="flex-1">
              <div className="font-semibold text-slate-900">Department Logs</div>
              <div className="text-sm text-slate-600">View department activity</div>
            </div>
            <span className="text-slate-700">→</span>
          </Link>
        </div>
      </div>

      <div className="bg-indigo-50 rounded-lg border border-indigo-200 p-5">
        <h4 className="font-semibold text-slate-900 mb-2">How to Submit a Checklist</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-slate-700">
          <li>Click on a form from the navigation bar or Quick Actions above</li>
          <li>Enter patient details: UHID, IPID, Patient Name, Ward, Unit No</li>
          <li>Select the Unit Chief from the dropdown</li>
          <li>Fill out all checklist items (YES/NO responses)</li>
          <li>Add remarks if needed</li>
          <li>Click "Submit Checklist" - you'll receive a confirmation</li>
        </ol>
        <p className="text-xs text-slate-600 mt-3 font-medium">
          Note: Each UHID + IPID + Department combination can only be submitted once. Check for duplicates before submitting.
        </p>
      </div>
    </div>
  )
}
