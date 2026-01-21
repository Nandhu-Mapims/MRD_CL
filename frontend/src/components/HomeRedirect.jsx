import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { DepartmentSelect } from '../pages/User/DepartmentSelect'

export function HomeRedirect() {
  const { user } = useAuth()

  if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />
  }

  // Redirect regular users to department logs
  if (user?.role === 'user') {
    return <Navigate to="/admin/department-logs" replace />
  }

  return <DepartmentSelect />
}

