import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

export function UserManagement() {
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'auditor',
    designation: '',
    departmentId: '',
    isActive: true,
  })

  useEffect(() => {
    loadUsers()
    loadDepartments()
    loadMasterData()
  }, [])

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
              <input
                type="password"
                required={!editingUser}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="••••••••"
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
              />
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
      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 lg:px-6 py-3 lg:py-4 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 lg:px-6 py-3 lg:py-4 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 lg:px-6 py-3 lg:py-4 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide">Role</th>
                <th className="text-left px-4 lg:px-6 py-3 lg:py-4 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide">Designation</th>
                <th className="text-left px-4 lg:px-6 py-3 lg:py-4 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide">Department</th>
                <th className="text-left px-4 lg:px-6 py-3 lg:py-4 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 lg:px-6 py-3 lg:py-4 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide">Created</th>
                <th className="text-center px-4 lg:px-6 py-3 lg:py-4 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-500 text-sm">
                    No users found. Click "Create New User" to add users.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50 transition-colors">
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
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {users.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center text-slate-500 text-sm">
            No users found. Click "Create New User" to add users.
          </div>
        ) : (
          users.map((user) => (
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

