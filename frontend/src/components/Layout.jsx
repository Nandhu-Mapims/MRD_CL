import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const isAdmin = user?.role === 'admin'

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-red-50 to-red-100">
      {/* New Header Design */}
      <header className="bg-white shadow-lg border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between py-2 sm:py-3 md:py-4 border-b border-red-100">
            <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                <span className="text-lg sm:text-xl md:text-2xl">🏥</span>
              </div>
              <div>
                <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-slate-800 group-hover:text-red-600 transition-colors">
                  Hospital Audit System
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">Medical Records Department</p>
              </div>
            </Link>
            {user && (
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                <div className="text-right hidden md:block pr-2 md:pr-4 border-r border-red-100">
                  <div className="text-xs sm:text-sm font-semibold text-slate-800">{user.name}</div>
                  <div className="text-[10px] sm:text-xs text-red-600 capitalize font-medium">{user.role}</div>
                </div>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-medium transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <span className="hidden sm:inline">Logout</span>
                  <span className="sm:hidden">Out</span>
                </button>
              </div>
            )}
          </div>

          {/* Navigation Bar */}
          {user && (
            <nav className="flex items-center gap-1 py-2 sm:py-2.5 md:py-3 overflow-x-auto scrollbar-hide">
              {isAdmin ? (
                <>
                  <Link
                    to="/admin/dashboard"
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive('/admin/dashboard')
                        ? 'bg-red-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-red-50 hover:text-red-600'
                    }`}
                  >
                    <span className="hidden sm:inline">📊 Dashboard</span>
                    <span className="sm:hidden">📊</span>
                  </Link>
                  <Link
                    to="/admin/forms"
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive('/admin/forms')
                        ? 'bg-red-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-red-50 hover:text-red-600'
                    }`}
                  >
                    <span className="hidden sm:inline">📋 Form Templates</span>
                    <span className="sm:hidden">📋</span>
                  </Link>
                  <Link
                    to="/admin/checklists"
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive('/admin/checklists')
                        ? 'bg-red-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-red-50 hover:text-red-600'
                    }`}
                  >
                    <span className="hidden sm:inline">✏️ Checklist Builder</span>
                    <span className="sm:hidden">✏️</span>
                  </Link>
                  <Link
                    to="/admin/departments"
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive('/admin/departments')
                        ? 'bg-red-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-red-50 hover:text-red-600'
                    }`}
                  >
                    <span className="hidden sm:inline">🏢 Departments</span>
                    <span className="sm:hidden">🏢</span>
                  </Link>
                  <Link
                    to="/admin/users"
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive('/admin/users')
                        ? 'bg-red-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-red-50 hover:text-red-600'
                    }`}
                  >
                    <span className="hidden sm:inline">👥 Users</span>
                    <span className="sm:hidden">👥</span>
                  </Link>
                  <Link
                    to="/admin/export"
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive('/admin/export')
                        ? 'bg-red-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-red-50 hover:text-red-600'
                    }`}
                  >
                    <span className="hidden sm:inline">📥 Export</span>
                    <span className="sm:hidden">📥</span>
                  </Link>
                  <Link
                    to="/admin/patient-report"
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive('/admin/patient-report')
                        ? 'bg-red-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-red-50 hover:text-red-600'
                    }`}
                  >
                    <span className="hidden sm:inline">📋 Patient Report</span>
                    <span className="sm:hidden">📋</span>
                  </Link>
                  <Link
                    to="/admin/department-logs"
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive('/admin/department-logs')
                        ? 'bg-red-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-red-50 hover:text-red-600'
                    }`}
                  >
                    <span className="hidden sm:inline">📊 Department Logs</span>
                    <span className="sm:hidden">📊</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/"
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive('/')
                        ? 'bg-red-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-red-50 hover:text-red-600'
                    }`}
                  >
                    <span className="hidden sm:inline">📝 Audit Form</span>
                    <span className="sm:hidden">📝</span>
                  </Link>
                  <Link
                    to="/admin/patient-report"
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive('/admin/patient-report')
                        ? 'bg-red-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-red-50 hover:text-red-600'
                    }`}
                  >
                    <span className="hidden sm:inline">📋 Patient Report</span>
                    <span className="sm:hidden">📋</span>
                  </Link>
                  <Link
                    to="/admin/department-logs"
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive('/admin/department-logs')
                        ? 'bg-red-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-red-50 hover:text-red-600'
                    }`}
                  >
                    <span className="hidden sm:inline">📊 Department Logs</span>
                    <span className="sm:hidden">📊</span>
                  </Link>
                </>
              )}
            </nav>
          )}
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">{children}</main>
    </div>
  )
}
