import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { ROLE_LABELS } from '../lib/roles'
import { Brand } from './Brand'
import { Icon } from './Icon'

interface PortalHeaderProps {
  context: 'portal' | 'staff'
}

function initials(username: string): string {
  const parts = username.replace(/[._-]+/g, ' ').trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export function PortalHeader({ context }: PortalHeaderProps) {
  const { session, logout } = useAuth()
  const navigate = useNavigate()

  if (!session) {
    return null
  }

  const homePath = context === 'portal' ? '/paciente' : '/staff'

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="portal-header">
      <div className="portal-header-inner">
        <Brand compact homePath={homePath} />
        <div className="header-context">
          <span className="header-context-dot" aria-hidden="true" />
          {context === 'portal' ? 'Portal del paciente' : 'Estación clínica'}
        </div>
        <div className="header-account">
          <span className="avatar" aria-hidden="true">
            {initials(session.username)}
          </span>
          <span className="account-copy">
            <span className="account-name">{session.username}</span>
            <span className="account-role">{ROLE_LABELS[session.role]}</span>
          </span>
          <button className="button button-quiet button-small" onClick={handleLogout} type="button">
            <Icon name="logout" size={17} />
            <span>Salir</span>
          </button>
        </div>
      </div>
    </header>
  )
}
