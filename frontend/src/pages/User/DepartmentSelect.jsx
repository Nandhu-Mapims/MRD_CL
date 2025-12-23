import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

export function DepartmentSelect() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      // Admin can see all departments
      if (user?.role === 'admin') {
        const data = await apiClient.get('/departments')
        const clinicalDepts = data.filter(
          (d) => d.isActive && d.code !== 'ANAE' && d.code !== 'NUS'
        )
        setLoading(false)
        // For now, admin also needs to select, but we could auto-redirect to dashboard
        return
      }

      // Regular users will see forms in the navigation menu
      setLoading(false)
    })()
  }, [user, navigate])

  // If regular user without department assignment, show message
  if (user?.role === 'user' && !user?.department) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">No Department Assigned</h2>
        <p className="text-slate-600">
          Your account is not assigned to any department. Please contact your administrator.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  // For regular users, show message that forms are in the menu
  if (user?.role === 'user' && user?.department) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-4xl mb-4">📝</div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Welcome!</h2>
        <p className="text-slate-600">
          Please select a form from the navigation menu above to get started.
        </p>
      </div>
    )
  }

  // This should only show for admin users
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-800">Select Department</h2>
      <p className="text-slate-600">Choose a department to fill audit forms</p>
    </div>
  )
}


