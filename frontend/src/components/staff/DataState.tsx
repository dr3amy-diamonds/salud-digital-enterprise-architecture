import type { ReactNode } from 'react'
import { Icon } from '../Icon'
import type { IconName } from '../Icon'

export function LoadingRows({ rows = 3, tall = false }: { rows?: number; tall?: boolean }) {
  return (
    <div aria-label="Cargando información" className="skeleton-list" role="status">
      {Array.from({ length: rows }).map((_, index) => (
        <span className={tall ? 'skeleton-row skeleton-row-tall' : 'skeleton-row'} key={index} />
      ))}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: IconName
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="inline-state inline-state-compact">
      <span className="state-icon">
        <Icon name={icon} size={22} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="inline-state inline-state-compact inline-state-error">
      <span className="state-icon">
        <Icon name="alert" size={22} />
      </span>
      <p>{message}</p>
      <button className="button button-secondary button-small" onClick={onRetry} type="button">
        <Icon name="refresh" size={16} />
        Reintentar
      </button>
    </div>
  )
}
