import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { DepartmentSelect } from '../pages/User/DepartmentSelect'

export function HomeRedirect() {
  const { user } = useAuth()

  if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />
  }

  // Redirect auditors to their dashboard
  if (user?.role === 'auditor') {
    return <Navigate to="/auditor/dashboard" replace />
  }

  // Redirect chiefs to their dashboard
  if (user?.role === 'chief') {
    return <Navigate to="/chief/dashboard" replace />
  }

  return <DepartmentSelect />
}

