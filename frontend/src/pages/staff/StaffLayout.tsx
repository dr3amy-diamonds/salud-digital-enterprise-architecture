import { NavLink, Outlet } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { PortalHeader } from '../../components/PortalHeader'
import { useAuth } from '../../context/auth'
import { ROLE_LABELS } from '../../lib/roles'
import type { StaffRole } from '../../lib/roles'
import { modulesForRole } from '../../lib/staffModules'
import './staff.css'

export function StaffLayout() {
  const { session } = useAuth()

  if (!session || session.role === 'paciente') {
    return null
  }

  const role = session.role as StaffRole
  const modules = modulesForRole(role)

  return (
    <div className="portal-page staff-shell">
      <a className="skip-link" href="#contenido-staff">
        Saltar al contenido
      </a>
      <PortalHeader context="staff" />
      <div className="staff-shell-body">
        <aside className="staff-rail">
          <div className="staff-rail-head">
            <span className="staff-rail-label">Espacio de trabajo</span>
            <strong>{ROLE_LABELS[role]}</strong>
          </div>
          <nav aria-label="Módulos del personal" className="staff-nav">
            <NavLink
              className={({ isActive }) => (isActive ? 'staff-nav-link is-active' : 'staff-nav-link')}
              end
              to="/staff"
            >
              <Icon name="shield" size={18} />
              Inicio
            </NavLink>
            {modules.map((module) => (
              <NavLink
                className={({ isActive }) => (isActive ? 'staff-nav-link is-active' : 'staff-nav-link')}
                key={module.id}
                to={module.path}
              >
                <Icon name={module.icon} size={18} />
                {module.name}
              </NavLink>
            ))}
          </nav>
          <div className="staff-rail-foot">
            <Icon name="lock" size={16} />
            <p>El servidor valida de nuevo cada permiso antes de responder.</p>
          </div>
        </aside>

        <main className="staff-content" id="contenido-staff">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
