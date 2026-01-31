import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#10b981', '#f59e0b', '#ef4444']

export function ChiefAnalytics() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [user])

  const loadAnalytics = async () => {
    if (!user?.name) return

    setLoading(true)
    try {
      // Get patients assigned to this chief
      const patients = await apiClient.get(`/chief/patients?chiefName=${encodeURIComponent(user.name)}`)
      
      // Calculate stats
      const totalPatients = patients.length
      const completedPatients = patients.filter(p => p.submissionsWithActions > 0).length
      const pendingPatients = totalPatients - completedPatients
      const totalSubmissions = patients.reduce((sum, p) => sum + p.totalSubmissions, 0)
      const submissionsWithActions = patients.reduce((sum, p) => sum + p.submissionsWithActions, 0)

      // By department
      const deptCounts = {}
      patients.forEach(p => {
        p.departments.forEach(dept => {
          deptCounts[dept] = (deptCounts[dept] || 0) + 1
        })
      })

      setStats({
        totalPatients,
        completedPatients,
        pendingPatients,
        totalSubmissions,
        submissionsWithActions,
        completionRate: totalSubmissions > 0 ? ((submissionsWithActions / totalSubmissions) * 100).toFixed(1) : 0,
        patientStatus: [
          { name: 'Completed', value: completedPatients },
          { name: 'Pending', value: pendingPatients },
        ],
        departmentDistribution: Object.entries(deptCounts).map(([name, count]) => ({ name, count })),
      })
    } catch (err) {
      console.error('Error loading analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-600">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-4 sm:py-5">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Chief Analytics</h1>
        <p className="mt-1 text-sm text-slate-600">Corrective & Preventive Actions Overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Patients</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats?.totalPatients || 0}</p>
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
              <p className="text-sm text-slate-600">Completed</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">{stats?.completedPatients || 0}</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-full">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Pending</p>
              <p className="text-3xl font-bold text-amber-600 mt-2">{stats?.pendingPatients || 0}</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-full">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Completion Rate</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats?.completionRate}%</p>
            </div>
            <div className="bg-slate-100 p-3 rounded-full">
              <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Status */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Patient Action Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats?.patientStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {stats?.patientStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f59e0b'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Department Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Patients by Department</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats?.departmentDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-slate-600">Total Checklist Items Reviewed</p>
            <p className="text-2xl font-bold text-purple-700 mt-2">{stats?.totalSubmissions || 0}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-slate-600">Items with Actions Added</p>
            <p className="text-2xl font-bold text-green-700 mt-2">{stats?.submissionsWithActions || 0}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
