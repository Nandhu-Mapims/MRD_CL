import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DepartmentManagement } from './pages/Admin/DepartmentManagement'
import { FormBuilder } from './pages/Admin/FormBuilder'
import { FormBuilderWithSections } from './pages/Admin/FormBuilderWithSections'
import { SimpleFormBuilder } from './pages/Admin/SimpleFormBuilder'
import { FormTemplateManagement } from './pages/Admin/FormTemplateManagement'
import { UserManagement } from './pages/Admin/UserManagement'
import { FormUserAssignment } from './pages/Admin/FormUserAssignment'
import { ChiefDashboard } from './pages/Chief/ChiefDashboard'
import { ChiefAnalytics } from './pages/Chief/ChiefAnalytics'
import { ChiefDoctorPerformance } from './pages/Chief/ChiefDoctorPerformance'
import { AuditorDashboard } from './pages/Auditor/AuditorDashboard'
import { AuditorAnalytics } from './pages/Auditor/AuditorAnalytics'
import { Dashboard } from './pages/Admin/Dashboard'
import { Analytics } from './pages/Admin/Analytics'
import { ChiefAnalytics as AdminChiefAnalytics } from './pages/Admin/ChiefAnalytics'
import { PatientReport } from './pages/Admin/PatientReport'
import { DepartmentLogs } from './pages/Admin/DepartmentLogs'
import { Form } from './pages/User/Form'
import { UserManual } from './pages/User/UserManual'
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
            path="/admin/assign-forms"
            element={
              <ProtectedRoute roles={['admin']}>
                <FormUserAssignment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chief/dashboard"
            element={
              <ProtectedRoute roles={['admin', 'chief']}>
                <ChiefDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chief/analytics"
            element={
              <ProtectedRoute roles={['admin', 'chief']}>
                <ChiefAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chief/doctor-performance"
            element={
              <ProtectedRoute roles={['admin', 'chief']}>
                <ChiefDoctorPerformance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/auditor/dashboard"
            element={
              <ProtectedRoute roles={['admin', 'auditor']}>
                <AuditorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/auditor/analytics"
            element={
              <ProtectedRoute roles={['admin', 'auditor']}>
                <AuditorAnalytics />
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
            path="/admin/analytics"
            element={
              <ProtectedRoute roles={['admin']}>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/chief-analytics"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminChiefAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/patient-report"
            element={
              <ProtectedRoute roles={['admin', 'auditor', 'chief']}>
                <PatientReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/department-logs"
            element={
              <ProtectedRoute roles={['admin', 'auditor', 'chief']}>
                <DepartmentLogs />
              </ProtectedRoute>
            }
          />

          <Route
            path="/form/:formTemplateId"
            element={
              <ProtectedRoute roles={['admin', 'auditor', 'chief']}>
                <Form />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-manual"
            element={
              <ProtectedRoute roles={['admin', 'auditor', 'chief']}>
                <UserManual />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute roles={['admin', 'auditor', 'chief']}>
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
