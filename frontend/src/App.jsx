import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DepartmentManagement } from './pages/Admin/DepartmentManagement'
import { FormBuilder } from './pages/Admin/FormBuilder'
import { FormBuilderWithSections } from './pages/Admin/FormBuilderWithSections'
import { SimpleFormBuilder } from './pages/Admin/SimpleFormBuilder'
import { FormTemplateManagement } from './pages/Admin/FormTemplateManagement'
import { UserManagement } from './pages/Admin/UserManagement'
import { Dashboard } from './pages/Admin/Dashboard'
import { ExportSubmissions } from './pages/Admin/ExportSubmissions'
import { PatientReport } from './pages/Admin/PatientReport'
import { DepartmentLogs } from './pages/Admin/DepartmentLogs'
import { Form } from './pages/User/Form'
import { ProtectedRoute } from './components/ProtectedRoute'
import { HomeRedirect } from './components/HomeRedirect'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/admin/departments"
            element={
              <ProtectedRoute roles={['admin']}>
                <DepartmentManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={['admin']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/forms"
            element={
              <ProtectedRoute roles={['admin']}>
                <FormTemplateManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/checklists"
            element={
              <ProtectedRoute roles={['admin']}>
                <SimpleFormBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute roles={['admin']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/export"
            element={
              <ProtectedRoute roles={['admin']}>
                <ExportSubmissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/patient-report"
            element={
              <ProtectedRoute roles={['admin', 'user']}>
                <PatientReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/department-logs"
            element={
              <ProtectedRoute roles={['admin', 'user']}>
                <DepartmentLogs />
              </ProtectedRoute>
            }
          />

          <Route
            path="/form/:formTemplateId"
            element={
              <ProtectedRoute roles={['admin', 'user']}>
                <Form />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute roles={['admin', 'user']}>
                <HomeRedirect />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
