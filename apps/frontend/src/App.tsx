import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ThemeProvider } from './context/ThemeContext'
import { TourProvider } from './context/TourContext'
import TourOverlay from './components/TourOverlay'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import EmployeeDashboard from './pages/EmployeeDashboard'
import OwnerDashboard from './pages/OwnerDashboard'
import UsersPage from './pages/admin/UsersPage'
import PetsPage from './pages/admin/PetsPage'
import CagesPage from './pages/admin/CagesPage'
import StaysPage from './pages/admin/StaysPage'
import AdminReportsPage from './pages/admin/ReportsPage'
import StatsPage from './pages/admin/StatsPage'
import EmployeeStaysPage from './pages/employee/StaysPage'
import ReportForm from './pages/employee/ReportForm'
import ReportsHistoryPage from './pages/employee/ReportsHistoryPage'
import EditReportPage from './pages/employee/EditReportPage'
import OwnerReportsPage from './pages/owner/OwnerReportsPage'
import OwnerPetsPage from './pages/owner/OwnerPetsPage'
import OwnerStaysPage from './pages/owner/OwnerStaysPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  const homes: Record<string, string> = { admin: '/admin', employee: '/employee', owner: '/owner' }
  return <Navigate to={homes[user.role] ?? '/login'} replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['admin']}>{children}</ProtectedRoute>
}
function EmployeeRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['employee', 'admin']}>{children}</ProtectedRoute>
}
function OwnerRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['owner']}>{children}</ProtectedRoute>
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
        <TourProvider>
        <TourOverlay />
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
          <Route path="/admin/pets" element={<AdminRoute><PetsPage /></AdminRoute>} />
          <Route path="/admin/cages" element={<AdminRoute><CagesPage /></AdminRoute>} />
          <Route path="/admin/stays" element={<AdminRoute><StaysPage /></AdminRoute>} />
          <Route path="/admin/reports" element={<AdminRoute><AdminReportsPage /></AdminRoute>} />
          <Route path="/admin/stats" element={<AdminRoute><StatsPage /></AdminRoute>} />

          {/* Employee */}
          <Route path="/employee" element={<EmployeeRoute><EmployeeDashboard /></EmployeeRoute>} />
          <Route path="/employee/stays" element={<EmployeeRoute><EmployeeStaysPage /></EmployeeRoute>} />
          <Route path="/employee/reports/new" element={<EmployeeRoute><ReportForm /></EmployeeRoute>} />
          <Route path="/employee/reports" element={<EmployeeRoute><ReportsHistoryPage /></EmployeeRoute>} />
          <Route path="/employee/reports/:id/edit" element={<EmployeeRoute><EditReportPage /></EmployeeRoute>} />

          {/* Owner */}
          <Route path="/owner" element={<OwnerRoute><OwnerDashboard /></OwnerRoute>} />
          <Route path="/owner/pets" element={<OwnerRoute><OwnerPetsPage /></OwnerRoute>} />
          <Route path="/owner/reports" element={<OwnerRoute><OwnerReportsPage /></OwnerRoute>} />
          <Route path="/owner/stays" element={<OwnerRoute><OwnerStaysPage /></OwnerRoute>} />

          {/* Profile — all roles */}
          <Route path="/profile" element={<ProtectedRoute allowedRoles={['admin', 'employee', 'owner']}><ProfilePage /></ProtectedRoute>} />

          {/* Settings — all roles */}
          <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin', 'employee', 'owner']}><SettingsPage /></ProtectedRoute>} />

          <Route path="*" element={<RootRedirect />} />
        </Routes>
        </TourProvider>
        </ToastProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
