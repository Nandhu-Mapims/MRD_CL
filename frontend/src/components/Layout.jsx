import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../api/client'

export function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const isAdmin = user?.role === 'admin'
  const [configMenuOpen, setConfigMenuOpen] = useState(false)
  const [createFormsMenuOpen, setCreateFormsMenuOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const [createFormsDropdownPosition, setCreateFormsDropdownPosition] = useState({ top: 0, left: 0 })
  const [userForms, setUserForms] = useState([])
  const configMenuRef = useRef(null)
  const configButtonRef = useRef(null)
  const createFormsMenuRef = useRef(null)
  const createFormsButtonRef = useRef(null)

  const isActive = (path) => location.pathname === path
  
  const isConfigActive = () => {
    return isActive('/admin/departments') || isActive('/admin/users')
  }

  const isCreateFormsActive = () => {
    return isActive('/admin/forms') || isActive('/admin/checklists')
  }

  // Load user's available forms
  useEffect(() => {
    const loadUserForms = async () => {
      if (user?.role === 'user') {
        try {
          const [allForms, departments] = await Promise.all([
            apiClient.get('/form-templates'),
            apiClient.get('/departments')
          ])
          
          // Get user department ID - handle both object and string formats
          let userDeptId = null
          if (user?.department) {
            userDeptId = typeof user.department === 'object' 
              ? (user.department.id || user.department._id) 
              : user.department
          }
          
          // Get ANAE and NUS department IDs - these forms are common for all users
          const anaDept = departments.find(d => d.code === 'ANAE')
          const nusDept = departments.find(d => d.code === 'NUS')
          const anaDeptId = anaDept?._id?.toString()
          const nusDeptId = nusDept?._id?.toString()
          
          const filtered = allForms.filter(form => {
            if (!form.isActive) return false
            
            // Check if form is assigned to ANAE or NUS departments - these are common for ALL users
            const isAnaeForm = form.departments?.some(d => {
              const deptId = typeof d === 'object' ? (d._id || d.id) : d
              return deptId?.toString() === anaDeptId
            })
            const isNusForm = form.departments?.some(d => {
              const deptId = typeof d === 'object' ? (d._id || d.id) : d
              return deptId?.toString() === nusDeptId
            })
            
            // Show ANAE and NUS forms to all users (common forms)
            if (isAnaeForm || isNusForm) return true
            
            // For other forms: only show if assigned to user's department
            if (!userDeptId) return false
            return form.departments?.some(d => {
              const deptId = typeof d === 'object' ? (d._id || d.id) : d
              return deptId?.toString() === userDeptId?.toString()
            })
          })
          setUserForms(filtered)
        } catch (err) {
          console.error('Error loading user forms:', err)
          setUserForms([])
        }
      }
    }
    loadUserForms()
  }, [user])

  // Calculate dropdown position when opening
  useEffect(() => {
    if (configMenuOpen && configButtonRef.current) {
      const rect = configButtonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX
      })
    }
  }, [configMenuOpen])

  useEffect(() => {
    if (createFormsMenuOpen && createFormsButtonRef.current) {
      const rect = createFormsButtonRef.current.getBoundingClientRect()
      setCreateFormsDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX
      })
    }
  }, [createFormsMenuOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        configMenuRef.current &&
        configButtonRef.current &&
        !configMenuRef.current.contains(event.target) &&
        !configButtonRef.current.contains(event.target)
      ) {
        setConfigMenuOpen(false)
      }
      if (
        createFormsMenuRef.current &&
        createFormsButtonRef.current &&
        !createFormsMenuRef.current.contains(event.target) &&
        !createFormsButtonRef.current.contains(event.target)
      ) {
        setCreateFormsMenuOpen(false)
      }
    }

    if (configMenuOpen || createFormsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [configMenuOpen, createFormsMenuOpen])

  // Close dropdown when route changes
  useEffect(() => {
    setConfigMenuOpen(false)
    setCreateFormsMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100">
      {/* New Header Design */}
      <header className="bg-white shadow-lg border-b-4 border-blue-600 relative z-50 overflow-visible">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 overflow-visible">
          {/* Top Bar */}
          <div className="flex items-center justify-between py-2 sm:py-3 md:py-4 border-b border-blue-100">
            <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                <span className="text-lg sm:text-xl md:text-2xl">🏥</span>
              </div>
              <div>
                <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                  Hospital Audit System
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">Medical Records Department</p>
              </div>
            </Link>
            {user && (
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                <div className="text-right hidden md:block pr-2 md:pr-4 border-r border-blue-100">
                  <div className="text-xs sm:text-sm font-semibold text-slate-800">{user.name}</div>
                  <div className="text-[10px] sm:text-xs text-blue-600 capitalize font-medium">{user.role}</div>
                </div>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <span className="hidden sm:inline">Logout</span>
                  <span className="sm:hidden">Out</span>
                </button>
              </div>
            )}
          </div>

          {/* Navigation Bar */}
          {user && (
            <nav className="flex items-center gap-1 py-2 sm:py-2.5 md:py-3 overflow-x-auto overflow-y-visible scrollbar-hide relative">
              {isAdmin ? (
                <>
                  <Link
                    to="/admin/dashboard"
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive('/admin/dashboard')
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <span className="hidden sm:inline">📊 Dashboard</span>
                    <span className="sm:hidden">📊</span>
                  </Link>
                  <Link
                    to="/admin/analytics"
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive('/admin/analytics')
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <span className="hidden sm:inline">✅ Analytics</span>
                    <span className="sm:hidden">✅</span>
                  </Link>
                  <Link
                    to="/admin/patient-report"
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive('/admin/patient-report')
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <span className="hidden sm:inline">📋 Patient Report</span>
                    <span className="sm:hidden">📋</span>
                  </Link>
                  <Link
                    to="/admin/department-logs"
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive('/admin/department-logs')
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <span className="hidden sm:inline">📊 Department Logs</span>
                    <span className="sm:hidden">📊</span>
                  </Link>
                  <div className="relative">
                    <button
                      ref={createFormsButtonRef}
                      onClick={() => setCreateFormsMenuOpen(!createFormsMenuOpen)}
                      className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1 ${
                        isCreateFormsActive()
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      <span className="hidden sm:inline">📝 Create Forms</span>
                      <span className="sm:hidden">📝</span>
                      <svg
                        className={`w-3 h-3 transition-transform ${createFormsMenuOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {createFormsMenuOpen && (
                      <div
                        ref={createFormsMenuRef}
                        className="fixed bg-white rounded-lg shadow-xl border-2 border-blue-100 min-w-[180px] z-[9999]"
                        style={{
                          top: `${createFormsDropdownPosition.top}px`,
                          left: `${createFormsDropdownPosition.left}px`
                        }}
                      >
                        <Link
                          to="/admin/forms"
                          className={`block px-4 py-2.5 text-xs sm:text-sm font-medium transition-all first:rounded-t-lg ${
                            isActive('/admin/forms')
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                          onClick={() => setCreateFormsMenuOpen(false)}
                        >
                          <span className="flex items-center gap-2">
                            <span>📋</span>
                            <span>Forms</span>
                          </span>
                        </Link>
                        <Link
                          to="/admin/checklists"
                          className={`block px-4 py-2.5 text-xs sm:text-sm font-medium transition-all border-t border-blue-100 last:rounded-b-lg ${
                            isActive('/admin/checklists')
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                          onClick={() => setCreateFormsMenuOpen(false)}
                        >
                          <span className="flex items-center gap-2">
                            <span>✏️</span>
                            <span>Form Builder</span>
                          </span>
                        </Link>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      ref={configButtonRef}
                      onClick={() => setConfigMenuOpen(!configMenuOpen)}
                      className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1 ${
                        isConfigActive()
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      <span className="hidden sm:inline">⚙️ Configure</span>
                      <span className="sm:hidden">⚙️</span>
                      <svg
                        className={`w-3 h-3 transition-transform ${configMenuOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {configMenuOpen && (
                      <div
                        ref={configMenuRef}
                        className="fixed bg-white rounded-lg shadow-xl border-2 border-blue-100 min-w-[180px] z-[9999]"
                        style={{
                          top: `${dropdownPosition.top}px`,
                          left: `${dropdownPosition.left}px`
                        }}
                      >
                        <Link
                          to="/admin/departments"
                          className={`block px-4 py-2.5 text-xs sm:text-sm font-medium transition-all first:rounded-t-lg ${
                            isActive('/admin/departments')
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                          onClick={() => setConfigMenuOpen(false)}
                        >
                          <span className="flex items-center gap-2">
                            <span>🏢</span>
                            <span>Departments</span>
                          </span>
                        </Link>
                        <Link
                          to="/admin/users"
                          className={`block px-4 py-2.5 text-xs sm:text-sm font-medium transition-all border-t border-blue-100 last:rounded-b-lg ${
                            isActive('/admin/users')
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                          onClick={() => setConfigMenuOpen(false)}
                        >
                          <span className="flex items-center gap-2">
                            <span>👥</span>
                            <span>Users</span>
                          </span>
                        </Link>
                      </div>
                    )}
                  </div>
                  <Link
                    to="/user-manual"
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive('/user-manual')
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <span className="hidden sm:inline">📖 User Manual</span>
                    <span className="sm:hidden">📖</span>
                  </Link>
                </>
              ) : (
                <>
                  {userForms.map((form) => (
                    <Link
                      key={form._id}
                      to={`/form/${form._id}`}
                      className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                        location.pathname === `/form/${form._id}`
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      <span className="hidden sm:inline">📝 {form.name}</span>
                      <span className="sm:hidden">📝</span>
                    </Link>
                  ))}
                  <Link
                    to="/admin/patient-report"
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive('/admin/patient-report')
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <span className="hidden sm:inline">📋 Patient Report</span>
                    <span className="sm:hidden">📋</span>
                  </Link>
                  <Link
                    to="/admin/department-logs"
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive('/admin/department-logs')
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <span className="hidden sm:inline">📊 Department Logs</span>
                    <span className="sm:hidden">📊</span>
                  </Link>
                  <Link
                    to="/user-manual"
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive('/user-manual')
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <span className="hidden sm:inline">📖 User Manual</span>
                    <span className="sm:hidden">📖</span>
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
