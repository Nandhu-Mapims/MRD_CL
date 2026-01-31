import { useState, useEffect } from 'react'
import { apiClient } from '../../api/client'

const isAssignable = (u) => u.role === 'auditor' || u.role === 'chief'

const userInFormDepartment = (user, form) => {
  if (!form?.departments?.length) return false
  const userDeptId = typeof user.department === 'object' ? user.department?._id : user.department
  if (!userDeptId) return false
  return form.departments.some((d) => {
    const formDeptId = typeof d === 'object' ? d._id : d
    return userDeptId.toString() === formDeptId.toString()
  })
}

const userMatchesSearch = (user, q) => {
  if (!q || !q.trim()) return true
  const s = q.trim().toLowerCase()
  const id = (user._id || '').toString().toLowerCase()
  const name = (user.name || '').toLowerCase()
  const email = (user.email || '').toLowerCase()
  return id.includes(s) || name.includes(s) || email.includes(s)
}

export function FormUserAssignment() {
  const [forms, setForms] = useState([])
  const [users, setUsers] = useState([])
  const [selectedForm, setSelectedForm] = useState(null)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showOtherUsers, setShowOtherUsers] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [formsData, usersData] = await Promise.all([
        apiClient.get('/form-templates'),
        apiClient.get('/departments/users'),
      ])
      setForms(formsData)
      setUsers(usersData)
    } catch (err) {
      alert('Error loading data: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  // Normalize assignedUsers to IDs (API may return raw ids or populated { _id } objects)
  const getAssignedUserIds = (form) => {
    if (!form?.assignedUsers?.length) return []
    return form.assignedUsers
      .map((u) => (u && typeof u === 'object' && u._id != null ? u._id : u))
      .filter(Boolean)
  }

  const handleSelectForm = (form) => {
    setSelectedForm(form)
    setSelectedUsers(getAssignedUserIds(form))
    setSearchQuery('')
    setShowOtherUsers(false)
  }

  const isUserSelected = (userId) =>
    selectedUsers.some((id) => String(id) === String(userId))

  const toggleUser = (userId) => {
    const idStr = String(userId)
    setSelectedUsers((prev) => {
      const has = prev.some((id) => String(id) === idStr)
      if (has) return prev.filter((id) => String(id) !== idStr)
      return [...prev, userId]
    })
  }

  const assignableUsers = users.filter(isAssignable)
  const departmentUsers = assignableUsers.filter((u) => userInFormDepartment(u, selectedForm) && userMatchesSearch(u, searchQuery))
  const otherUsers = assignableUsers.filter((u) => !userInFormDepartment(u, selectedForm) && userMatchesSearch(u, searchQuery))

  // For left panel: count assigned users by same-dept (green) vs cross-dept (yellow)
  const getAssignedCountsByDept = (form) => {
    const ids = getAssignedUserIds(form)
    let sameDept = 0
    let crossDept = 0
    for (const id of ids) {
      const user = users.find((u) => String(u._id) === String(id))
      if (!user) continue
      if (userInFormDepartment(user, form)) sameDept++
      else crossDept++
    }
    return { sameDept, crossDept }
  }

  const handleSave = async () => {
    if (!selectedForm) return

    setSaving(true)
    try {
      await apiClient.put(`/form-templates/${selectedForm._id}/assign-users`, {
        userIds: selectedUsers,
      })
      alert('User assignment updated successfully')
      loadData()
      setSelectedForm(null)
      setSelectedUsers([])
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md border border-indigo-200/50 rounded-2xl shadow-xl px-5 py-4 sm:py-5">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Assign Checklists to Users</h1>
        <p className="mt-1 text-sm text-slate-600">
          Assign specific forms to auditors. Auditors can access forms from any department when assigned.
        </p>
        <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-slate-700">
          <div className="flex flex-col gap-1">
            <span>• One auditor can access forms from multiple departments</span>
            <span>• If no users assigned, only the form's department users can access</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forms List */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-indigo-200/50">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">Forms / Checklists</h3>
            <p className="text-sm text-slate-600 mt-1">Click to assign users</p>
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {forms.map((form) => (
              <div
                key={form._id}
                onClick={() => handleSelectForm(form)}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedForm?._id === form._id
                    ? 'bg-indigo-50 border-l-4 border-indigo-600'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-slate-800">{form.name}</div>
                <div className="text-sm text-slate-600 mt-1">
                  {form.departments?.map((d) => d.name).join(', ') || 'No department'}
                </div>
                <div className="text-xs text-slate-500 mt-2 flex flex-wrap gap-1.5 items-center">
                  {(() => {
                    const { sameDept, crossDept } = getAssignedCountsByDept(form)
                    return (
                      <>
                        {sameDept > 0 && (
                          <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-medium" title="Same department">
                            {sameDept} user{sameDept !== 1 ? 's' : ''}
                          </span>
                        )}
                        {crossDept > 0 && (
                          <span className="inline-block px-2 py-1 bg-amber-100 text-amber-800 rounded font-medium" title="Other department">
                            {crossDept} user{crossDept !== 1 ? 's' : ''} – other department
                          </span>
                        )}
                        {sameDept === 0 && crossDept === 0 && (
                          <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded">
                            Available to all department users
                          </span>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Selection */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-indigo-200/50">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">
              {selectedForm ? `Assign Users to: ${selectedForm.name}` : 'Select a form'}
            </h3>
            {selectedForm && (
              <p className="text-sm text-slate-600 mt-1">
                Select auditors who can access this checklist
              </p>
            )}
          </div>
          {selectedForm ? (
            <div>
              <div className="p-4 space-y-4">
                {/* Search - by ID, name, email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Search users</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by ID, name, or email..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {assignableUsers.length === 0 ? (
                  <div className="text-center py-8 text-slate-600">
                    No users found. Create auditor or chief users first.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[420px] overflow-y-auto">
                    {/* Department users - always visible */}
                    <div>
                      <div className="text-xs font-semibold text-slate-700 mb-2 px-2">
                        👥 {selectedForm.departments?.map((d) => (typeof d === 'object' ? d.name : '')).filter(Boolean).join(', ') || 'Form'} Department Users
                      </div>
                      {departmentUsers.length === 0 ? (
                        <p className="text-xs text-slate-500 px-2 py-2">
                          {searchQuery ? 'No users match your search in this department.' : 'No users in this department.'}
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {departmentUsers.map((user) => (
                            <label
                              key={user._id}
                              className="flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50 cursor-pointer border border-indigo-200 bg-indigo-50"
                            >
                              <input
                                type="checkbox"
                                checked={isUserSelected(user._id)}
                                onChange={() => toggleUser(user._id)}
                                className="w-5 h-5 text-indigo-700 border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-slate-800 truncate">{user.name}</div>
                                <div className="text-sm text-slate-600 truncate">{user.email}</div>
                                <div className="text-xs text-slate-500 mt-1">
                                  {user.department?.name || 'No department'}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Show other users - expandable for cross-department */}
                    <div className="border-t border-slate-200 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowOtherUsers((v) => !v)}
                        className="flex items-center gap-2 w-full text-left px-2 py-2 rounded-lg hover:bg-slate-100 text-slate-700"
                      >
                        <span className="text-sm font-semibold">👤 Other users (cross-department)</span>
                        <span className="text-slate-500 text-xs">
                          {otherUsers.length} user{otherUsers.length !== 1 ? 's' : ''}
                        </span>
                        <span className="ml-auto text-slate-400">{showOtherUsers ? '▼' : '▶'}</span>
                      </button>
                      {showOtherUsers && (
                        <div className="mt-2 space-y-1">
                          {otherUsers.length === 0 ? (
                            <p className="text-xs text-slate-500 px-2 py-2">
                              {searchQuery ? 'No other users match your search.' : 'No other department users.'}
                            </p>
                          ) : (
                            otherUsers.map((user) => (
                              <label
                                key={user._id}
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer border border-slate-200"
                              >
                                <input
                                  type="checkbox"
                                  checked={isUserSelected(user._id)}
                                  onChange={() => toggleUser(user._id)}
                                  className="w-5 h-5 text-indigo-700 border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-slate-800 truncate">{user.name}</div>
                                  <div className="text-sm text-slate-600 truncate">{user.email}</div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    {user.department?.name || 'No department'}
                                    <span className="ml-1 text-amber-600">• Cross-dept</span>
                                  </div>
                                </div>
                              </label>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    {selectedUsers.length === 0 ? (
                      <span>⚠️ No users selected - only {selectedForm.departments?.map(d => d.name).join(', ')} users can access</span>
                    ) : (
                      <span>✓ {selectedUsers.length} user(s) selected (cross-department access enabled)</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedForm(null)
                        setSelectedUsers([])
                      }}
                      className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors shadow-sm"
                    >
                      {saving ? 'Saving...' : 'Save Assignment'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-600">
              Select a form from the left to assign users
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
