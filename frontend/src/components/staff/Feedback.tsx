import { Icon } from '../Icon'

interface FeedbackProps {
  tone: 'success' | 'error'
  children: string
}

export function Feedback({ tone, children }: FeedbackProps) {
  const isError = tone === 'error'
  return (
    <p
      aria-live={isError ? 'assertive' : 'polite'}
      className={isError ? 'form-message form-message-error' : 'form-message form-message-success'}
      role={isError ? 'alert' : 'status'}
    >
      <Icon name={isError ? 'alert' : 'check'} size={18} />
      {children}
    </p>
  )
}
