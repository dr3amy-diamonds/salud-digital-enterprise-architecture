import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/auth'
import { isStaffRole } from '../../lib/roles'
import { moduleById } from '../../lib/staffModules'
import type { StaffModuleId } from '../../lib/staffModules'

export function ModuleGuard({ moduleId, children }: { moduleId: StaffModuleId; children: ReactNode }) {
  const { session } = useAuth()

  if (!session || !isStaffRole(session.role)) {
    return <Navigate to="/login" replace />
  }

  const module = moduleById(moduleId)
  if (!module.roles.includes(session.role)) {
    return <Navigate to="/staff" replace />
  }

  return children
}
