import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { DepartmentSelect } from '../pages/User/DepartmentSelect'

export function HomeRedirect() {
  const { user } = useAuth()

  if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />
  }

  // Redirect regular users to multi-department checklist
  if (user?.role === 'user' && user?.department) {
    return <Navigate to="/multi-dept-checklist" replace />
  }

  return <DepartmentSelect />
}

