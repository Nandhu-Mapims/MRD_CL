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
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium px-3 py-2 rounded-lg text-sm w-full shadow-md transition-all"
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

      <div className="bg-white shadow rounded">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Code</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d._id} className="border-t">
                <td className="px-3 py-2">{d.name}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{d.code}</td>
                <td className="px-3 py-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      d.isActive ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {d.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right space-x-2">
                  <button
                    onClick={() => handleEdit(d)}
                    className="text-xs text-slate-700 underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(d)}
                    className="text-xs text-slate-700 underline"
                  >
                    {d.isActive ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


