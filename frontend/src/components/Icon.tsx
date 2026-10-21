import type { SVGProps } from 'react'

export type IconName =
  | 'alert'
  | 'arrow-right'
  | 'calendar'
  | 'chart'
  | 'check'
  | 'chevron'
  | 'clipboard'
  | 'clock'
  | 'download'
  | 'file'
  | 'flask'
  | 'lock'
  | 'logout'
  | 'mail'
  | 'pill'
  | 'receipt'
  | 'refresh'
  | 'shield'
  | 'user'
  | 'users'

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  size?: number
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      {...props}
    >
      <IconPaths name={name} />
    </svg>
  )
}

function IconPaths({ name }: { name: IconName }) {
  switch (name) {
    case 'alert':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16h.01" />
        </>
      )
    case 'arrow-right':
      return (
        <>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </>
      )
    case 'calendar':
      return (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </>
      )
    case 'chart':
      return (
        <>
          <path d="M4 20V4M4 20h16" />
          <path d="M8 16v-5M12 16V8M16 16v-8" />
        </>
      )
    case 'check':
      return <path d="m5 12 4 4L19 6" />
    case 'chevron':
      return <path d="m9 18 6-6-6-6" />
    case 'clipboard':
      return (
        <>
          <path d="M9 5h6M9 3h6a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1V5a2 2 0 0 1 2-2Z" />
          <path d="M8 12h8M8 16h5" />
        </>
      )
    case 'clock':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      )
    case 'download':
      return (
        <>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </>
      )
    case 'file':
      return (
        <>
          <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v5h5M9 13h6M9 17h4" />
        </>
      )
    case 'flask':
      return (
        <>
          <path d="M9 3h6M10 3v6l-5 8a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-8V3" />
          <path d="M7.5 15h9" />
        </>
      )
    case 'lock':
      return (
        <>
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
        </>
      )
    case 'logout':
      return (
        <>
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
        </>
      )
    case 'mail':
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </>
      )
    case 'pill':
      return (
        <>
          <path d="m10.5 3.5 10 10a4.95 4.95 0 0 1-7 7l-10-10a4.95 4.95 0 0 1 7-7Z" />
          <path d="m8.5 8.5 7 7" />
        </>
      )
    case 'receipt':
      return (
        <>
          <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </>
      )
    case 'refresh':
      return (
        <>
          <path d="M20 7v5h-5" />
          <path d="M4 17v-5h5" />
          <path d="M6.1 8a7 7 0 0 1 11.5-1L20 12M4 12l2.4 5a7 7 0 0 0 11.5-1" />
        </>
      )
    case 'shield':
      return (
        <>
          <path d="M12 3 4.5 6v5.5c0 4.6 3.2 7.9 7.5 9.5 4.3-1.6 7.5-4.9 7.5-9.5V6Z" />
          <path d="m9 12 2 2 4-4" />
        </>
      )
    case 'user':
      return (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
        </>
      )
    case 'users':
      return (
        <>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
          <path d="M16 5a3 3 0 0 1 0 6M17.5 14.5A5.5 5.5 0 0 1 22 20" />
        </>
      )
    default:
      return null
  }
}
