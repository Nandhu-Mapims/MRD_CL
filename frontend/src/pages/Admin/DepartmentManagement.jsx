import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

export function DepartmentManagement() {
  const [departments, setDepartments] = useState([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [editing, setEditing] = useState(null)

  const load = async () => {
    const data = await apiClient.get('/departments')
    setDepartments(data)
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editing) {
      await apiClient.put(`/departments/${editing._id}`, { name, code, isActive: editing.isActive })
    } else {
      await apiClient.post('/departments', { name, code })
    }
    setName('')
    setCode('')
    setEditing(null)
    await load()
  }

  const handleEdit = (dept) => {
    setEditing(dept)
    setName(dept.name)
    setCode(dept.code)
  }

  const toggleActive = async (dept) => {
    await apiClient.put(`/departments/${dept._id}`, {
      name: dept.name,
      code: dept.code,
      isActive: !dept.isActive,
    })
    await load()
  }

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800">Department Management</h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 mt-1">Create and manage hospital departments</p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow rounded p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
      >
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
          <input
            className="border rounded w-full px-2 py-1 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Code</label>
          <input
            className="border rounded w-full px-2 py-1 text-sm"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </div>
        <div>
          <button
            type="submit"
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-3 py-2 rounded-lg text-sm w-full shadow-md transition-all"
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
            className="text-xs text-slate-500 underline"
          >
            Cancel edit
          </button>
        )}
      </form>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 text-white">
              <tr>
                <th className="text-left px-4 lg:px-6 py-3 font-semibold text-xs lg:text-sm">Name</th>
                <th className="text-left px-4 lg:px-6 py-3 font-semibold text-xs lg:text-sm">Code</th>
                <th className="text-left px-4 lg:px-6 py-3 font-semibold text-xs lg:text-sm">Status</th>
                <th className="text-center px-4 lg:px-6 py-3 font-semibold text-xs lg:text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {departments.map((d) => (
                <tr key={d._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 lg:px-6 py-3 text-sm font-medium text-slate-800">{d.name}</td>
                  <td className="px-4 lg:px-6 py-3 text-xs lg:text-sm text-slate-600 font-mono">{d.code}</td>
                  <td className="px-4 lg:px-6 py-3">
                    <span
                      className={`px-2 lg:px-3 py-1 rounded-full text-xs font-medium ${
                        d.isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {d.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(d)}
                        className="text-blue-600 hover:text-blue-700 text-xs lg:text-sm font-medium px-2 lg:px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActive(d)}
                        className="text-blue-600 hover:text-blue-700 text-xs lg:text-sm font-medium px-2 lg:px-3 py-1 rounded hover:bg-blue-50 transition-colors"
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
          <div key={d._id} className="bg-white rounded-lg shadow-md border border-slate-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800 text-sm mb-1">{d.name}</h3>
                <p className="text-xs text-slate-600 font-mono">{d.code}</p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  d.isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {d.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => handleEdit(d)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => toggleActive(d)}
                className="flex-1 bg-slate-600 hover:bg-slate-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
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


