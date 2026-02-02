import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function ChiefDoctorPerformance() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState('submissions') // submissions, thoroughness, patients

  useEffect(() => {
    loadPerformanceData()
  }, [user])

  const loadPerformanceData = async () => {
    if (!user?.name) {
      setError('User name not found. Please log in again.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const result = await apiClient.get(`/chief/doctor-performance?chiefName=${encodeURIComponent(user.name)}`)
      setData(result)
    } catch (err) {
      console.error('Error loading auditor performance:', err)
      setError(err.response?.data?.message || 'Failed to load auditor performance data')
    } finally {
      setLoading(false)
    }
  }

  const getSortedDoctors = () => {
    if (!data?.doctors) return []

    const doctors = [...data.doctors]
    switch (sortBy) {
      case 'thoroughness':
        return doctors.sort((a, b) => b.thoroughnessRate - a.thoroughnessRate)
      case 'patients':
        return doctors.sort((a, b) => b.totalPatients - a.totalPatients)
      case 'submissions':
      default:
        return doctors.sort((a, b) => b.totalSubmissions - a.totalSubmissions)
    }
  }

  const getThoroughnessColor = (rate) => {
    if (rate >= 90) return 'text-emerald-700 bg-emerald-50'
    if (rate >= 75) return 'text-indigo-700 bg-indigo-50'
    if (rate >= 60) return 'text-amber-700 bg-amber-50'
    return 'text-red-700 bg-red-50'
  }

  const getThoroughnessRank = (rate) => {
    if (rate >= 90) return { label: 'Excellent', emoji: '⭐' }
    if (rate >= 75) return { label: 'Good', emoji: '✅' }
    if (rate >= 60) return { label: 'Average', emoji: '⚠️' }
    return { label: 'Needs Improvement', emoji: '❌' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-600">Loading auditor performance data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    )
  }

  const sortedDoctors = getSortedDoctors()

  // Calculate overall statistics
  const totalSubmissions = data?.doctors?.reduce((sum, d) => sum + d.totalSubmissions, 0) || 0
  const avgThoroughnessRate = data?.doctors?.length > 0
    ? (data.doctors.reduce((sum, d) => sum + d.thoroughnessRate, 0) / data.doctors.length).toFixed(1)
    : 0

  // Prepare chart data
  const thoroughnessChartData = sortedDoctors.slice(0, 10).map((d) => ({
    name: d.doctor.name.split(' ').slice(0, 2).join(' '), // Shorten name
    thoroughness: d.thoroughnessRate,
    missing: 100 - d.thoroughnessRate,
  }))

  const submissionsChartData = sortedDoctors.slice(0, 10).map((d) => ({
    name: d.doctor.name.split(' ').slice(0, 2).join(' '),
    submissions: d.totalSubmissions,
  }))

  // Thoroughness distribution (when auditor marks NO, did they document with remarks?)
  const thoroughnessDistribution = [
    { name: 'Excellent (≥90%)', value: data?.doctors?.filter(d => d.thoroughnessRate >= 90).length || 0 },
    { name: 'Good (75-89%)', value: data?.doctors?.filter(d => d.thoroughnessRate >= 75 && d.thoroughnessRate < 90).length || 0 },
    { name: 'Average (60-74%)', value: data?.doctors?.filter(d => d.thoroughnessRate >= 60 && d.thoroughnessRate < 75).length || 0 },
    { name: 'Needs Improvement (<60%)', value: data?.doctors?.filter(d => d.thoroughnessRate < 60).length || 0 },
  ].filter(item => item.value > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-4 sm:py-5">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Auditor Performance Analytics</h1>
        <p className="mt-1 text-sm text-slate-600">Track auditor productivity and documentation thoroughness</p>
        <p className="text-xs text-slate-500 mt-1">Chief: {user?.name}</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Auditors</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{data?.totalDoctors || 0}</p>
            </div>
            <div className="bg-slate-100 p-3 rounded-full">
              <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Submissions</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{totalSubmissions}</p>
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
              <p className="text-sm text-slate-600">Avg Documentation Thoroughness</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">{avgThoroughnessRate}%</p>
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
              <p className="text-sm text-slate-600">Most Active Auditor</p>
              <p className="text-lg font-bold text-slate-900 mt-2">
                {sortedDoctors[0]?.totalSubmissions || 0} items
              </p>
              <p className="text-xs text-slate-500 truncate">{sortedDoctors[0]?.doctor.name}</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-full">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documentation Thoroughness Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Documentation Thoroughness Distribution</h3>
          <p className="text-xs text-slate-500 mb-2">% of NO responses that have remarks documented</p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={thoroughnessDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {thoroughnessDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top 10 Documentation Thoroughness */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Top 10 Documentation Thoroughness</h3>
          <p className="text-xs text-slate-500 mb-2">When auditors mark NO, % with remarks documented</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={thoroughnessChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="thoroughness" fill="#10b981" name="Thoroughness %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top 10 Submission Counts */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Top 10 Most Active Auditors</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={submissionsChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="submissions" fill="#8b5cf6" name="Total Submissions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Auditor Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Auditor Performance Details</h3>
              <p className="text-sm text-slate-600 mt-1">
                Detailed performance metrics for each auditor
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('submissions')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  sortBy === 'submissions'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Sort by Submissions
              </button>
              <button
                onClick={() => setSortBy('thoroughness')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  sortBy === 'thoroughness'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Sort by Thoroughness
              </button>
              <button
                onClick={() => setSortBy('patients')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  sortBy === 'patients'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Sort by Patients
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-semibold text-slate-700">#</th>
                <th className="text-left p-3 font-semibold text-slate-700">Auditor Name</th>
                <th className="text-left p-3 font-semibold text-slate-700">Email</th>
                <th className="text-center p-3 font-semibold text-slate-700">Total Submissions</th>
                <th className="text-center p-3 font-semibold text-slate-700">NO Responses</th>
                <th className="text-center p-3 font-semibold text-slate-700">NO w/ Remarks</th>
                <th className="text-center p-3 font-semibold text-slate-700">Thoroughness</th>
                <th className="text-center p-3 font-semibold text-slate-700">Patients</th>
                <th className="text-left p-3 font-semibold text-slate-700">Departments</th>
                <th className="text-center p-3 font-semibold text-slate-700">Performance</th>
                <th className="text-left p-3 font-semibold text-slate-700">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {sortedDoctors.length === 0 ? (
                <tr>
                  <td colSpan="11" className="p-8 text-center text-slate-600">
                    No auditor performance data available yet.
                  </td>
                </tr>
              ) : (
                sortedDoctors.map((doctor, index) => {
                  const rank = getThoroughnessRank(doctor.thoroughnessRate)
                  return (
                    <tr key={doctor.doctor.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 text-slate-600">{index + 1}</td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{doctor.doctor.name}</div>
                        <div className="text-xs text-slate-500">{doctor.doctor.role}</div>
                      </td>
                      <td className="p-3 text-slate-600 text-xs">{doctor.doctor.email}</td>
                      <td className="p-3 text-center">
                        <span className="inline-block px-2 py-1 rounded bg-blue-100 text-blue-800 font-semibold">
                          {doctor.totalSubmissions}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-block px-2 py-1 rounded bg-amber-50 text-amber-800 font-semibold">
                          {doctor.noResponses}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-800 font-semibold">
                          {doctor.noWithRemarks}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full font-bold ${getThoroughnessColor(doctor.thoroughnessRate)}`}>
                          {doctor.thoroughnessRate}%
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-800 font-semibold">
                          {doctor.totalPatients}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-600">
                        {doctor.departments.join(', ') || 'N/A'}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xl">{rank.emoji}</span>
                          <span className="text-xs text-slate-600">{rank.label}</span>
                        </div>
                      </td>
                      <td className="p-3 text-xs text-slate-600">
                        {new Date(doctor.lastSubmittedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-indigo-50 rounded-lg border border-indigo-200 p-4">
        <h4 className="font-semibold text-slate-900 mb-3">Performance Metrics Explained</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-900 font-medium mb-1">Documentation Thoroughness:</p>
            <p className="text-slate-700">
              When an auditor marks &quot;NO&quot; (non-compliance), did they document with remarks?
              This reflects how well auditors identify and document issues. Higher is better.
            </p>
          </div>
          <div>
            <p className="text-slate-900 font-medium mb-1">Performance Ranking:</p>
            <ul className="text-slate-700 space-y-1">
              <li>⭐ Excellent: ≥90% of NOs documented with remarks</li>
              <li>✅ Good: 75-89%</li>
              <li>⚠️ Average: 60-74%</li>
              <li>❌ Needs Improvement: &lt;60%</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-3 italic">
          Note: YES/NO responses reflect department compliance, not auditor performance. Auditors document what they observe.
        </p>
      </div>
    </div>
  )
}
