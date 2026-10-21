import { Link } from 'react-router-dom'

interface BrandProps {
  homePath: string
  tone?: 'dark' | 'light'
  compact?: boolean
}

export function Brand({ homePath, tone = 'dark', compact = false }: BrandProps) {
  return (
    <Link className={`brand brand-${tone}${compact ? ' brand-compact' : ''}`} to={homePath}>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 28 28" fill="none">
          <path d="M14 7v14M7 14h14" stroke="currentColor" strokeLinecap="round" strokeWidth="3.2" />
        </svg>
      </span>
      <span className="brand-copy">
        <span className="brand-name" translate="no">SaludDigital</span>
        {!compact && <span className="brand-subtitle">Portal clínico</span>}
      </span>
    </Link>
  )
}
