import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts'

const COLORS = ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#60a5fa', '#93c5fd', '#dbeafe']

export function Dashboard() {
  const [stats, setStats] = useState(null)
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setError('')
      setLoading(true)
      // Load basic stats first (without clearance stats for faster response)
      // Clearance stats can be loaded separately if needed
      const [statData, deptData] = await Promise.all([
        apiClient.get('/audits/stats?includeClearance=false'),
        apiClient.get('/departments'),
      ])
      setStats(statData)
      setDepartments(deptData)
      
      // Optionally load clearance stats in background (non-blocking)
      // This can be enabled later if needed
      // apiClient.get('/audits/stats?includeClearance=true')
      //   .then(fullStats => {
      //     if (fullStats.clearanceStats) {
      //       setStats(prev => ({ ...prev, clearanceStats: fullStats.clearanceStats }))
      //     }
      //   })
      //   .catch(err => console.warn('Failed to load clearance stats:', err))
    } catch (err) {
      console.error('Error loading dashboard data', err)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load dashboard data'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const getDeptName = (id) => {
    if (!id) return 'Unknown'
    const dept = departments.find((d) => d._id === id || d._id?.toString() === id?.toString())
    return dept?.name || 'Unknown'
  }

  const getDeptCode = (id) => {
    if (!id) return 'N/A'
    const dept = departments.find((d) => d._id === id || d._id?.toString() === id?.toString())
    return dept?.code || 'N/A'
  }

  // Show UI immediately with skeleton
  const MetricsSkeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg p-4 sm:p-6 border border-blue-100">
          <div className="h-3 bg-slate-200 rounded w-1/2 mb-3 animate-pulse" />
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-2 animate-pulse" />
          <div className="h-2 bg-slate-200 rounded w-2/3 animate-pulse" />
        </div>
      ))}
    </div>
  )

  if (loading && !stats) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white rounded-xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-5"></div>
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 drop-shadow-lg">
              Audit Dashboard
            </h2>
            <p className="text-blue-100 text-sm sm:text-base">
              Comprehensive department-wise compliance and case analytics
            </p>
          </div>
        </div>
        <MetricsSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-xl p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Audit Dashboard</h2>
          <p className="text-blue-100">Department-wise compliance and case analytics</p>
        </div>
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-800 font-semibold mb-2">Error Loading Dashboard Data</p>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!stats || !stats.departmentStats || stats.departmentStats.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-xl p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Audit Dashboard</h2>
          <p className="text-blue-100">Department-wise compliance and case analytics</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-dashed border-slate-300">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-slate-600 text-lg font-medium mb-2">No audit data available yet</p>
          <p className="text-sm text-slate-500">
            Start creating audit submissions to see statistics here
          </p>
        </div>
      </div>
    )
  }

  const { departmentStats, overall, totalCases } = stats

  // Prepare chart data
  const barChartData = departmentStats.map((s) => ({
    name: getDeptCode(s._id),
    fullName: getDeptName(s._id),
    cases: s.caseCount || 0,
    submissions: s.total || 0,
    compliant: s.compliant || 0,
    nonCompliant: s.nonCompliant || 0,
    compliance: s.total > 0 ? Math.round((s.compliant / s.total) * 100) : 0,
  }))

  const pieChartData = departmentStats.map((s) => ({
    name: getDeptCode(s._id),
    value: s.caseCount || 0,
  }))

  const complianceData = departmentStats.map((s) => ({
    name: getDeptCode(s._id),
    compliance: s.total > 0 ? Math.round((s.compliant / s.total) * 100) : 0,
  }))

  const totalCompliance =
    overall.totalSubmissions > 0
      ? Math.round((overall.totalCompliant / overall.totalSubmissions) * 100)
      : 0

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Elegant Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white rounded-xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-5"></div>
        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 drop-shadow-lg">
            Audit Dashboard
          </h2>
          <p className="text-blue-100 text-sm sm:text-base">
            Comprehensive department-wise compliance and case analytics
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg p-4 sm:p-6 border border-blue-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs text-slate-600 mb-1 font-medium uppercase tracking-wide">
                Total Cases
              </p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600">{totalCases}</p>
              <p className="text-[9px] sm:text-xs text-slate-500 mt-1">Unique patients</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 shadow-lg">
              <span className="text-xl sm:text-2xl md:text-3xl">📋</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg p-4 sm:p-6 border border-blue-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs text-slate-600 mb-1 font-medium uppercase tracking-wide">
                Submissions
              </p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600">
                {overall.totalSubmissions || 0}
              </p>
              <p className="text-[9px] sm:text-xs text-slate-500 mt-1">Total entries</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 shadow-lg">
              <span className="text-xl sm:text-2xl md:text-3xl">📝</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-green-50 rounded-xl shadow-lg p-4 sm:p-6 border border-green-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs text-slate-600 mb-1 font-medium uppercase tracking-wide">
                Compliance
              </p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-600">{totalCompliance}%</p>
              <p className="text-[9px] sm:text-xs text-slate-500 mt-1">Overall rate</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 shadow-lg">
              <span className="text-xl sm:text-2xl md:text-3xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-orange-50 rounded-xl shadow-lg p-4 sm:p-6 border border-orange-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs text-slate-600 mb-1 font-medium uppercase tracking-wide">
                Open Issues
              </p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-orange-600">
                {overall.totalOpenIssues || 0}
              </p>
              <p className="text-[9px] sm:text-xs text-slate-500 mt-1">Requires attention</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 shadow-lg">
              <span className="text-xl sm:text-2xl md:text-3xl">⚠️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Cases by Department - Enhanced Bar Chart */}
        <div className="bg-white rounded-xl shadow-lg p-5 sm:p-6 border border-slate-100 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">
                Cases Count by Department
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">Patient cases distribution</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-lg">📊</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280} className="sm:h-[320px]">
            <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                stroke="#64748b" 
                fontSize={11}
                tick={{ fill: '#64748b' }}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={11}
                tick={{ fill: '#64748b' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  padding: '12px',
                }}
                formatter={(value, name) => {
                  if (name === 'cases') return [value, 'Cases']
                  if (name === 'submissions') return [value, 'Submissions']
                  return [value, name]
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar 
                dataKey="cases" 
                fill="url(#colorCases)" 
                name="Cases" 
                radius={[8, 8, 0, 0]}
                stroke="#2563eb"
                strokeWidth={1}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cases Distribution - Enhanced Pie Chart */}
        <div className="bg-white rounded-xl shadow-lg p-5 sm:p-6 border border-slate-100 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">
                Cases Distribution
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">Percentage breakdown</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-lg">🥧</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280} className="sm:h-[320px]">
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
                stroke="#fff"
                strokeWidth={2}
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Enhanced Compliance Chart */}
      <div className="bg-white rounded-xl shadow-lg p-5 sm:p-6 border border-slate-100 hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">
              Compliance Rate by Department
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">Trend analysis across departments</p>
          </div>
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <span className="text-lg">📈</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280} className="sm:h-[320px]">
          <AreaChart data={complianceData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorCompliance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              stroke="#64748b" 
              fontSize={11}
              tick={{ fill: '#64748b' }}
            />
            <YAxis 
              stroke="#64748b" 
              domain={[0, 100]} 
              fontSize={11}
              tick={{ fill: '#64748b' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                padding: '12px',
              }}
              formatter={(value) => [`${value}%`, 'Compliance']}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Area
              type="monotone"
              dataKey="compliance"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#colorCompliance)"
              name="Compliance %"
            />
            <Line
              type="monotone"
              dataKey="compliance"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ fill: '#2563eb', r: 5, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 7 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Enhanced Department-wise Detailed Stats */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-100">
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 text-white px-5 sm:px-6 py-4 sm:py-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <span className="text-xl">📋</span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">Department-wise Statistics</h3>
              <p className="text-blue-100 text-xs sm:text-sm">Detailed breakdown by department</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-4 sm:px-6 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Cases
                </th>
                <th className="px-4 sm:px-6 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Submissions
                </th>
                <th className="px-4 sm:px-6 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Compliant
                </th>
                <th className="px-4 sm:px-6 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Non-Compliant
                </th>
                <th className="px-4 sm:px-6 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Compliance %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {barChartData.map((dept, index) => (
                <tr 
                  key={index} 
                  className="hover:bg-blue-50 transition-colors duration-150"
                >
                  <td className="px-4 sm:px-6 py-4">
                    <div className="font-semibold text-sm sm:text-base text-slate-800">{dept.fullName}</div>
                    <div className="text-xs text-slate-500">({dept.name})</div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-center">
                    <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-semibold">
                      {dept.cases}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-center text-sm sm:text-base text-slate-700 font-medium">
                    {dept.submissions}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-center">
                    <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-semibold">
                      {dept.compliant}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-center">
                    <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-semibold">
                      {dept.nonCompliant}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 sm:w-24 md:w-32 bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-full transition-all duration-500"
                          style={{ width: `${dept.compliance}%` }}
                        />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-slate-800 w-12 text-right">
                        {dept.compliance}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
