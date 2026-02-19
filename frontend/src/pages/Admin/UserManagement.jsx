import { useEffect, useState, useRef } from 'react'
import { apiClient } from '../../api/client'

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'chief', label: 'Chief/HOD' },
  { value: 'auditor', label: 'Auditor' },
]

export function UserManagement() {
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [roleFilter, setRoleFilter] = useState('')
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const roleDropdownRef = useRef(null)
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false)
  const departmentDropdownRef = useRef(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'auditor',
    designation: '',
    departmentId: '',
    isActive: true,
  })

  const passwordRules = [
    { key: 'length', label: 'At least 8 characters', valid: formData.password.length >= 8 },
    { key: 'uppercase', label: 'At least 1 uppercase letter (A-Z)', valid: /[A-Z]/.test(formData.password) },
    { key: 'lowercase', label: 'At least 1 lowercase letter (a-z)', valid: /[a-z]/.test(formData.password) },
    { key: 'number', label: 'At least 1 number (0-9)', valid: /\d/.test(formData.password) },
    { key: 'special', label: 'At least 1 special character (!@#$...)', valid: /[^A-Za-z0-9]/.test(formData.password) },
  ]

  const isPasswordStrong = passwordRules.every((rule) => rule.valid)
  const showPasswordRules = isPasswordFocused && !isPasswordStrong

  useEffect(() => {
    loadUsers()
    loadDepartments()
    loadMasterData()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target)) {
        setRoleDropdownOpen(false)
      }
      if (departmentDropdownRef.current && !departmentDropdownRef.current.contains(e.target)) {
        setDepartmentDropdownOpen(false)
      }
    }
    if (roleDropdownOpen || departmentDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
    }
    return () => document.removeEventListener('click', handleClickOutside)
  }, [roleDropdownOpen, departmentDropdownOpen])

  const loadMasterData = async () => {
    try {
      const data = await apiClient.get('/master-data')
      setDesignations(data.designations || [])
    } catch (err) {
      console.error('Error loading master data', err)
    }
  }

  const loadDepartments = async () => {
    try {
      const data = await apiClient.get('/departments')
      setDepartments(data)
    } catch (err) {
      console.error('Error loading departments', err)
    }
  }

  const loadUsers = async () => {
    try {
      const data = await apiClient.get('/auth/users')
      setUsers(data)
    } catch (err) {
      console.error('Error loading users', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if ((!editingUser || formData.password) && !isPasswordStrong) {
      alert('Password does not match required pattern. Please satisfy all password rules.')
      return
    }

    try {
      if (editingUser) {
        const updateData = { ...formData }
        if (!updateData.password) {
          delete updateData.password
        }
        await apiClient.put(`/auth/users/${editingUser._id}`, updateData)
      } else {
        await apiClient.post('/auth/users', formData)
      }
      setShowForm(false)
      setEditingUser(null)
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'auditor',
        designation: '',
        departmentId: '',
        isActive: true,
      })
      loadUsers()
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving user')
      console.error(err)
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role || 'auditor',
      designation: user.designation || '',
      departmentId: user.department?._id || user.department?.id || '',
      isActive: user.isActive !== undefined ? user.isActive : true,
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    try {
      await apiClient.delete(`/auth/users/${id}`)
      loadUsers()
    } catch (err) {
      alert('Error deleting user')
      console.error(err)
    }
  }

  const totalUsers = users.length
  const activeUsers = users.filter((u) => u.isActive !== false).length
  const chiefCount = users.filter((u) => u.role === 'chief').length
  const auditorCount = users.filter((u) => u.role === 'auditor').length

  const getUserDeptId = (u) => u.department?._id ?? u.department?.id ?? (typeof u.department === 'string' ? u.department : null)
  const filteredUsers = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false
    if (departmentFilter) {
      const deptId = getUserDeptId(u)
      if (deptId === null || String(deptId) !== String(departmentFilter)) return false
    }
    return true
  })

  const roleFilterLabel = ROLE_OPTIONS.find((o) => o.value === roleFilter)?.label ?? 'Role'
  const departmentFilterLabel = departmentFilter
    ? (departments.find((d) => String(d._id) === String(departmentFilter))?.name ?? 'Department')
    : 'All departments'

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800">User Management</h2>
          <p className="text-xs sm:text-sm md:text-base text-slate-600 mt-1">Create and manage user accounts</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            setEditingUser(null)
            setFormData({
              name: '',
              email: '',
              password: '',
              role: 'auditor',
              designation: '',
              departmentId: '',
              isActive: true,
            })
          }}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm transition-colors text-xs sm:text-sm font-medium"
        >
          Create New User
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wide">Total Users</p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold text-slate-800">{totalUsers}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wide">Active Users</p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold text-emerald-600">{activeUsers}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wide">Chiefs</p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold text-indigo-600">{chiefCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wide">Auditors</p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold text-blue-600">{auditorCount}</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            {editingUser ? 'Edit User' : 'Create New User'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="user@hospital.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password {editingUser ? '(leave blank to keep current)' : '*'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  className="w-full border border-slate-300 rounded-lg pl-3 pr-10 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {showPasswordRules && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-slate-600 mb-1.5">Password requirements</p>
                  <div className="space-y-1.5">
                    {passwordRules.map((rule) => (
                      <div key={rule.key} className="flex items-start gap-2">
                        <span
                          className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                            rule.valid ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          aria-hidden="true"
                        />
                        <span
                          className={`text-xs leading-4 ${
                            rule.valid ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Role *
              </label>
              <select
                required
                value={formData.role}
                onChange={(e) => {
                  const newRole = e.target.value
                  setFormData({
                    ...formData,
                    role: newRole,
                    departmentId: newRole === 'admin' ? '' : formData.departmentId,
                  })
                }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="auditor">Auditor</option>
                <option value="chief">Chief</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Designation
              </label>
              <select
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select designation</option>
                {designations.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {(formData.role === 'auditor' || formData.role === 'chief') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Department * (Required for auditors and chiefs — e.g. MRD, clinical dept)
                </label>
                <select
                  required={formData.role === 'auditor' || formData.role === 'chief'}
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm text-slate-700">
                Active (user can login)
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg shadow-sm transition-colors text-sm font-medium"
              >
                {editingUser ? 'Update' : 'Create'} User
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingUser(null)
                }}
                className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-6 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 lg:px-6 py-3 lg:py-4 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide w-12">#</th>
                <th className="text-left px-4 lg:px-6 py-3 lg:py-4 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 lg:px-6 py-3 lg:py-4 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 lg:px-6 py-3 lg:py-4 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide">
                  <div className="relative inline-block" ref={roleDropdownRef}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setRoleDropdownOpen((o) => !o)
                      }}
                      className="flex items-center gap-1.5 group focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded px-1 -ml-1"
                      aria-haspopup="listbox"
                      aria-expanded={roleDropdownOpen}
                    >
                      <span>Role</span>
                      <svg className={`w-4 h-4 text-slate-500 transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      {roleFilter && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-medium">
                          {roleFilterLabel}
                        </span>
                      )}
                    </button>
                    {roleDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1 z-20 min-w-[140px] rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                        {ROLE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value || 'all'}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setRoleFilter(opt.value)
                              setRoleDropdownOpen(false)
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${opt.value === roleFilter ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </th>
                <th className="text-left px-4 lg:px-6 py-3 lg:py-4 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide">Designation</th>
                <th className="text-left px-4 lg:px-6 py-3 lg:py-4 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide">
                  <div className="relative inline-block" ref={departmentDropdownRef}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDepartmentDropdownOpen((o) => !o)
                      }}
                      className="flex items-center gap-1.5 group focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded px-1 -ml-1"
                      aria-haspopup="listbox"
                      aria-expanded={departmentDropdownOpen}
                    >
                      <span>Department</span>
                      <svg className={`w-4 h-4 text-slate-500 transition-transform ${departmentDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      {departmentFilter && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-medium max-w-[120px] truncate inline-block" title={departmentFilterLabel}>
                          {departmentFilterLabel}
                        </span>
                      )}
                    </button>
                    {departmentDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1 z-20 min-w-[180px] max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDepartmentFilter('')
                            setDepartmentDropdownOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${!departmentFilter ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}`}
                        >
                          All departments
                        </button>
                        {departments.map((dept) => (
                          <button
                            key={dept._id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDepartmentFilter(dept._id)
                              setDepartmentDropdownOpen(false)
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 truncate ${String(dept._id) === String(departmentFilter) ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}`}
                            title={dept.name}
                          >
                            {dept.name} {dept.code ? `(${dept.code})` : ''}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </th>
                <th className="text-left px-4 lg:px-6 py-3 lg:py-4 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 lg:px-6 py-3 lg:py-4 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide">Created</th>
                <th className="text-center px-4 lg:px-6 py-3 lg:py-4 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-slate-500 text-sm">
                    {users.length === 0
                      ? 'No users found. Click "Create New User" to add users.'
                      : `No users match.${roleFilter ? ` Role: ${roleFilterLabel}.` : ''}${departmentFilter ? ` Department: ${departmentFilterLabel}.` : ''}`}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, idx) => (
                  <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-slate-500 font-medium text-sm">{idx + 1}</td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 font-medium text-slate-800 text-sm">{user.name}</td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-slate-600 text-sm">{user.email}</td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4">
                      <span
                        className={`px-2 lg:px-3 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {user.role === 'admin' ? 'Admin' : user.role === 'chief' ? 'Chief/HOD' : 'Auditor'}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm text-slate-600">
                      {user.designation || '—'}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm text-slate-600">
                      {user.department
                        ? `${user.department.name || user.department} (${user.department.code || ''})`
                        : user.role === 'admin'
                          ? 'All Departments'
                          : 'Not Assigned'}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4">
                      <span
                        className={`px-2 lg:px-3 py-1 rounded-full text-xs font-medium ${
                          user.isActive
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-indigo-700 hover:text-indigo-800 text-xs lg:text-sm font-medium px-2 lg:px-3 py-1 rounded hover:bg-indigo-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="text-red-600 hover:text-red-700 text-xs lg:text-sm font-medium px-2 lg:px-3 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="mobile-role-filter" className="text-xs font-medium text-slate-600 whitespace-nowrap">Role:</label>
            <select
              id="mobile-role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="mobile-dept-filter" className="text-xs font-medium text-slate-600 whitespace-nowrap">Dept:</label>
            <select
              id="mobile-dept-filter"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All departments</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>{dept.name} {dept.code ? `(${dept.code})` : ''}</option>
              ))}
            </select>
          </div>
        </div>
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center text-slate-500 text-sm">
            {users.length === 0
              ? 'No users found. Click "Create New User" to add users.'
              : `No users match.${roleFilter ? ` Role: ${roleFilterLabel}.` : ''}${departmentFilter ? ` Department: ${departmentFilterLabel}.` : ''}`}
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div key={user._id} className="bg-white rounded-lg shadow-md border border-slate-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800 text-sm mb-1">{user.name}</h3>
                  <p className="text-xs text-slate-600 mb-2">{user.email}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {user.role === 'admin' ? 'Admin' : 'User'}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {user.designation && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Designation:</span>
                    <span className="text-slate-700 font-medium">{user.designation}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Department:</span>
                  <span className="text-slate-700 font-medium">
                    {user.department
                      ? `${user.department.name || user.department} (${user.department.code || ''})`
                      : user.role === 'admin'
                        ? 'All Departments'
                        : 'Not Assigned'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Created:</span>
                  <span className="text-slate-700">{new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
                <button
                  onClick={() => handleEdit(user)}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(user._id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

