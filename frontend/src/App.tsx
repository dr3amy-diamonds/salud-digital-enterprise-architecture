import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ModuleGuard } from './components/staff/ModuleGuard'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/auth'
import { homePathForRole, STAFF_ROLES } from './lib/roles'
import { Login } from './pages/Login'
import { PacienteDashboard } from './pages/PacienteDashboard'
import { StaffDashboard } from './pages/StaffDashboard'
import { AdmisionView } from './pages/staff/AdmisionView'
import { ClinicoView } from './pages/staff/ClinicoView'
import { FacturacionView } from './pages/staff/FacturacionView'
import { FarmaciaView } from './pages/staff/FarmaciaView'
import { GerenciaView } from './pages/staff/GerenciaView'
import { LabView } from './pages/staff/LabView'
import { StaffLayout } from './pages/staff/StaffLayout'
import { UsuariosView } from './pages/staff/UsuariosView'

function CatchAll() {
  const { session } = useAuth()
  return <Navigate to={session ? homePathForRole(session.role) : '/login'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/paciente"
        element={
          <ProtectedRoute allowedRoles={['paciente']}>
            <PacienteDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff"
        element={
          <ProtectedRoute allowedRoles={STAFF_ROLES}>
            <StaffLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StaffDashboard />} />
        <Route
          path="admision"
          element={
            <ModuleGuard moduleId="admision">
              <AdmisionView />
            </ModuleGuard>
          }
        />
        <Route
          path="clinico"
          element={
            <ModuleGuard moduleId="clinico">
              <ClinicoView />
            </ModuleGuard>
          }
        />
        <Route
          path="laboratorio"
          element={
            <ModuleGuard moduleId="laboratorio">
              <LabView />
            </ModuleGuard>
          }
        />
        <Route
          path="farmacia"
          element={
            <ModuleGuard moduleId="farmacia">
              <FarmaciaView />
            </ModuleGuard>
          }
        />
        <Route
          path="facturacion"
          element={
            <ModuleGuard moduleId="facturacion">
              <FacturacionView />
            </ModuleGuard>
          }
        />
        <Route
          path="gerencia"
          element={
            <ModuleGuard moduleId="gerencia">
              <GerenciaView />
            </ModuleGuard>
          }
        />
        <Route
          path="usuarios"
          element={
            <ModuleGuard moduleId="usuarios">
              <UsuariosView />
            </ModuleGuard>
          }
        />
      </Route>
      <Route path="*" element={<CatchAll />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
