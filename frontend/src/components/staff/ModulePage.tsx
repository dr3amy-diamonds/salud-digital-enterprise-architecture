import type { ReactNode } from 'react'
import { Icon } from '../Icon'
import type { IconName } from '../Icon'

interface ModulePageProps {
  kicker: string
  title: string
  description: string
  icon: IconName
  action?: ReactNode
  readOnly?: boolean
  children: ReactNode
}

export function ModulePage({ kicker, title, description, icon, action, readOnly = false, children }: ModulePageProps) {
  return (
    <div className="staff-page">
      <header className="staff-page-head">
        <div className="staff-page-copy">
          <p className="section-kicker">
            <Icon name={icon} size={16} />
            {kicker}
          </p>
          <h1>{title}</h1>
          <p className="page-subtitle">{description}</p>
        </div>
        {(action || readOnly) && (
          <div className="staff-page-actions">
            {readOnly && (
              <span className="readonly-badge">
                <Icon name="shield" size={15} />
                Vista de Solo Lectura
              </span>
            )}
            {action}
          </div>
        )}
      </header>
      {children}
    </div>
  )
}
