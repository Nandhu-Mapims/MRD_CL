import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

export function DepartmentManagement() {
  const [departments, setDepartments] = useState([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setError('')
      const data = await apiClient.get('/departments')
      setDepartments(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error loading departments', err)
      setError(err.response?.data?.message || err.message || 'Failed to load departments')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editing) {
        await apiClient.put(`/departments/${editing._id}`, { name, code, isActive: editing.isActive })
      } else {
        await apiClient.post('/departments', { name, code })
      }
      setName('')
      setCode('')
      setEditing(null)
      await load()
    } catch (err) {
      console.error('Error saving department', err)
      setError(err.response?.data?.message || err.message || 'Failed to save department')
    }
  }

  const handleEdit = (dept) => {
    setEditing(dept)
    setName(dept.name)
    setCode(dept.code)
  }

  const toggleActive = async (dept) => {
    try {
      setError('')
      await apiClient.put(`/departments/${dept._id}`, {
        name: dept.name,
        code: dept.code,
        isActive: !dept.isActive,
      })
      await load()
    } catch (err) {
      console.error('Error toggling department status', err)
      setError(err.response?.data?.message || err.message || 'Failed to update department status')
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800">Department Management</h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 mt-1">Create and manage hospital departments</p>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-medium">Dismiss</button>
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-sm rounded-xl border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
      >
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Name</label>
          <input
            className="border border-slate-300 rounded-lg w-full px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Code</label>
          <input
            className="border border-slate-300 rounded-lg w-full px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </div>
        <div>
          <button
            type="submit"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium px-3 py-2 rounded-lg text-sm w-full shadow-sm transition-all"
          >
            {editing ? 'Update' : 'Add'} Department
          </button>
        </div>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setName('')
              setCode('')
            }}
            className="text-xs text-indigo-700 hover:text-indigo-800 font-medium"
          >
            Cancel edit
          </button>
        )}
      </form>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white shadow-sm rounded-xl overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 lg:px-6 py-3 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide w-12">#</th>
                <th className="text-left px-4 lg:px-6 py-3 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 lg:px-6 py-3 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide">Code</th>
                <th className="text-left px-4 lg:px-6 py-3 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide">Status</th>
                <th className="text-center px-4 lg:px-6 py-3 font-semibold text-xs lg:text-sm text-slate-700 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {departments.map((d, idx) => (
                <tr key={d._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 lg:px-6 py-3 text-slate-500 font-medium text-sm">{idx + 1}</td>
                  <td className="px-4 lg:px-6 py-3 text-sm font-medium text-slate-800">{d.name}</td>
                  <td className="px-4 lg:px-6 py-3 text-xs lg:text-sm text-slate-600 font-mono">{d.code}</td>
                  <td className="px-4 lg:px-6 py-3">
                    <span
                      className={`px-2 lg:px-3 py-1 rounded-full text-xs font-medium ${
                        d.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {d.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(d)}
                        className="text-indigo-700 hover:text-indigo-800 text-xs lg:text-sm font-medium px-2 lg:px-3 py-1 rounded hover:bg-indigo-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActive(d)}
                        className="text-slate-700 hover:text-slate-800 text-xs lg:text-sm font-medium px-2 lg:px-3 py-1 rounded hover:bg-slate-100 transition-colors"
                      >
                        {d.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {departments.map((d) => (
          <div key={d._id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800 text-sm mb-1">{d.name}</h3>
                <p className="text-xs text-slate-600 font-mono">{d.code}</p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  d.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {d.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => handleEdit(d)}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => toggleActive(d)}
                className="flex-1 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                {d.isActive ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


