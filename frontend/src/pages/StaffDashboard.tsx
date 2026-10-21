import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { useAuth } from '../context/auth'
import { ROLE_LABELS } from '../lib/roles'
import type { StaffRole } from '../lib/roles'
import { modulesForRole, STAFF_MODULES } from '../lib/staffModules'
import './StaffDashboard.css'

const ROLE_SUMMARY: Record<StaffRole, string> = {
  medico: 'Acceso clínico para atender pacientes y consultar su información.',
  bacteriologo: 'Trabajo centrado en el procesamiento y entrega de resultados.',
  farmaceutico: 'Gestión de dispensación y trazabilidad de medicamentos.',
  cajero: 'Operación de facturación y relación de pagos con atenciones.',
  gerencia: 'Visibilidad administrativa sobre la operación y la cartera.',
  admin: 'Control institucional de usuarios, permisos y configuración.',
}

function todayLabel(): string {
  const text = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function StaffDashboard() {
  const { session } = useAuth()

  if (!session || session.role === 'paciente') {
    return null
  }

  const role = session.role
  const modules = modulesForRole(role)

  return (
    <div className="staff-page staff-overview">
      <section className="staff-hero">
        <div className="staff-hero-copy">
          <p className="eyebrow">Estación clínica · {todayLabel()}</p>
          <h1>Tu jornada, con el acceso correcto.</h1>
          <p className="page-subtitle">
            Hola, {session.username}. Este espacio reúne los módulos habilitados para tu rol y
            mantiene cada proceso dentro de sus permisos.
          </p>
        </div>
        <div className="role-pill">
          <span className="role-pill-icon">
            <Icon name="shield" size={22} />
          </span>
          <div>
            <span>Rol activo</span>
            <strong>{ROLE_LABELS[role]}</strong>
          </div>
        </div>
      </section>

      <section aria-label="Resumen de acceso" className="workspace-stats">
        <div className="workspace-stat">
          <span className="workspace-stat-label">Módulos disponibles</span>
          <strong>{modules.length.toString().padStart(2, '0')}</strong>
          <span>de {STAFF_MODULES.length} módulos institucionales</span>
        </div>
        <div className="workspace-stat">
          <span className="workspace-stat-label">Validación de permisos</span>
          <strong className="workspace-stat-text">Cliente + servidor</strong>
          <span>Cada solicitud se verifica con el rol del token.</span>
        </div>
        <div className="workspace-stat workspace-stat-security">
          <span className="workspace-stat-label">Sesión</span>
          <span className="live-status">
            <span aria-hidden="true" className="live-dot" />
            Protegida
          </span>
          <span>El acceso se cierra al vencer el token.</span>
        </div>
      </section>

      <div className="staff-layout">
        <section aria-labelledby="modules-title" className="modules-section">
          <div className="modules-heading">
            <div>
              <p className="section-kicker">
                <Icon name="shield" size={16} />
                Permisos por rol
              </p>
              <h2 id="modules-title">Módulos de trabajo</h2>
            </div>
            <span className="count-badge">{modules.length}</span>
          </div>

          <div className="module-grid">
            {modules.map((module) => (
              <Link className="module-card" key={module.id} to={module.path}>
                <span className="module-card-top">
                  <span className="module-number">{module.number}</span>
                  <span className="module-icon">
                    <Icon name={module.icon} size={22} />
                  </span>
                  <span className="module-chevron">
                    <Icon name="arrow-right" size={18} />
                  </span>
                </span>
                <span className="module-name">{module.name}</span>
                <span className="module-description">{module.description}</span>
                <span className="module-open">Abrir módulo</span>
              </Link>
            ))}
          </div>
        </section>

        <aside aria-labelledby="access-title" className="access-panel">
          <span className="access-emblem">
            <Icon name="shield" size={28} />
          </span>
          <p className="section-kicker">Tu acceso</p>
          <h2 id="access-title">{ROLE_LABELS[role]}</h2>
          <p className="access-summary">{ROLE_SUMMARY[role]}</p>

          <div className="access-divider" />

          <span className="access-list-title">Módulos visibles para tu cuenta</span>
          <ul className="access-list">
            {modules.map((module) => (
              <li key={module.id}>
                <span className="access-check">
                  <Icon name="check" size={13} />
                </span>
                {module.name}
              </li>
            ))}
          </ul>

          <div className="access-note">
            <Icon name="lock" size={17} />
            <p>
              Los módulos visibles se ajustan al rol. Las rutas del servidor vuelven a validar los
              permisos antes de responder.
            </p>
          </div>
        </aside>
      </div>

      <p className="portal-foot">
        <Icon name="shield" size={15} />
        Entorno clínico protegido · Los accesos quedan sujetos a la política institucional.
      </p>
    </div>
  )
}
