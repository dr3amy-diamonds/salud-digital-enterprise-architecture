import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/auth'
import { homePathForRole } from '../lib/roles'
import type { Role } from '../lib/roles'

interface ProtectedRouteProps {
  allowedRoles: readonly Role[]
  children: ReactNode
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { session } = useAuth()
  const location = useLocation()

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!allowedRoles.includes(session.role)) {
    return <Navigate to={homePathForRole(session.role)} replace />
  }

  return children
}
