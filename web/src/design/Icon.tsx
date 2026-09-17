import type { CSSProperties } from 'react'

/**
 * Hand-drawn stand-ins for the SF Symbols the iOS app uses. SF Symbols are not
 * licensed for the web, so these are simple 24×24 strokes that read the same
 * at the sizes the app draws them.
 */
export type IconName =
  | 'plus'
  | 'ellipsis'
  | 'chevron.left'
  | 'chevron.right'
  | 'chevron.up.down'
  | 'sparkles'
  | 'circle.slash'
  | 'delete.left'
  | 'checkmark.circle.fill'
  | 'circle'
  | 'checkmark'
  | 'pencil'
  | 'info.circle'
  | 'info.circle.fill'
  | 'exclamationmark.triangle.fill'
  | 'exclamationmark.circle.fill'
  | 'arrow.up.right'
  | 'arrow.down.left'
  | 'arrow.left.arrow.right'
  | 'repeat'
  | 'trash'
  | 'lock'
  | 'gearshape'
  | 'archivebox'
  | 'arrow.triangle.merge'
  | 'arrow.uturn.backward'
  | 'plus.circle'
  | 'arrow.up.arrow.down'
  | 'tray.full.fill'
  | 'list.bullet'
  | 'calendar'
  | 'chart.pie.fill'
  | 'cart.fill'
  | 'calendar.badge.clock'
  | 'banknote.fill'
  | 'faceid'
  | 'xmark'
  | 'line.3.horizontal'

interface IconProps {
  name: IconName
  size?: number
  strokeWidth?: number
  className?: string
  style?: CSSProperties
  title?: string
}

export function Icon({ name, size = 20, strokeWidth = 2, className, style, title }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flex: 'none', display: 'inline-block', verticalAlign: 'middle', ...style }}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {paths[name]}
    </svg>
  )
}

const paths: Record<IconName, React.ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  ellipsis: (
    <g fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </g>
  ),
  'chevron.left': <path d="M15 5l-7 7 7 7" />,
  'chevron.right': <path d="M9 5l7 7-7 7" />,
  'chevron.up.down': <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />,
  sparkles: (
    <g fill="currentColor" stroke="none">
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z" />
      <path d="M5 15l.9 2.6L8.5 18.5l-2.6.9L5 22l-.9-2.6L1.5 18.5l2.6-.9z" />
      <path d="M19 14l.7 1.9 1.9.7-1.9.7L19 19l-.7-1.7-1.9-.7 1.9-.7z" />
    </g>
  ),
  'circle.slash': (
    <g>
      <circle cx="12" cy="12" r="8" />
      <path d="M6.5 6.5l11 11" />
    </g>
  ),
  'delete.left': (
    <g>
      <path d="M9 5h11a1 1 0 011 1v12a1 1 0 01-1 1H9L3 12l6-7z" />
      <path d="M12 9l5 6M17 9l-5 6" />
    </g>
  ),
  'checkmark.circle.fill': (
    <g>
      <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
      <path d="M8 12.5l2.5 2.5L16 9.5" stroke="var(--icon-check-color, var(--color-text-on-accent))" strokeWidth="2.2" />
    </g>
  ),
  circle: <circle cx="12" cy="12" r="9" />,
  checkmark: <path d="M5 12.5l4.5 4.5L19 7" />,
  pencil: <path d="M4 20l4.2-1 10.4-10.4a1.5 1.5 0 000-2.1l-1.1-1.1a1.5 1.5 0 00-2.1 0L5 15.8 4 20zM14 6.5l3.5 3.5" />,
  'info.circle': (
    <g>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </g>
  ),
  'info.circle.fill': (
    <g>
      <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
      <path d="M12 11v5M12 8h.01" stroke="var(--color-surface)" strokeWidth="2.2" />
    </g>
  ),
  'exclamationmark.triangle.fill': (
    <g>
      <path d="M12 3l10 18H2L12 3z" fill="currentColor" stroke="none" />
      <path d="M12 9v5M12 17h.01" stroke="var(--color-surface)" strokeWidth="2.2" />
    </g>
  ),
  'exclamationmark.circle.fill': (
    <g>
      <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
      <path d="M12 7v6M12 16.5h.01" stroke="var(--color-surface)" strokeWidth="2.2" />
    </g>
  ),
  'arrow.up.right': <path d="M7 17L17 7M9 7h8v8" />,
  'arrow.down.left': <path d="M17 7L7 17M15 17H7V9" />,
  'arrow.left.arrow.right': <path d="M4 8h13l-3-3M20 16H7l3 3" />,
  repeat: <path d="M17 2l4 4-4 4M3 11V9a4 4 0 014-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  lock: (
    <g>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </g>
  ),
  gearshape: (
    <g>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
    </g>
  ),
  archivebox: (
    <g>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 001 1h12a1 1 0 001-1V8M10 12h4" />
    </g>
  ),
  'arrow.triangle.merge': <path d="M12 21V11M12 11L7 6M12 11l5-5M7 6H4M17 6h3M9 21h6" />,
  'arrow.uturn.backward': <path d="M8 9l-4-4 4-4M4 5h10a6 6 0 010 12h-3" />,
  'plus.circle': (
    <g>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </g>
  ),
  'arrow.up.arrow.down': <path d="M8 20V4M4 8l4-4 4 4M16 4v16M12 16l4 4 4-4" />,
  'tray.full.fill': (
    <g fill="currentColor" stroke="none">
      <path d="M3 13h5a4 4 0 008 0h5v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5z" />
      <path d="M5 4h14v2H5zM4 8h16v2H4z" />
    </g>
  ),
  'list.bullet': (
    <g>
      <path d="M9 6h12M9 12h12M9 18h12" />
      <circle cx="4.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </g>
  ),
  calendar: (
    <g>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01M16 17.5h.01" strokeWidth="2.5" />
    </g>
  ),
  'chart.pie.fill': (
    <g fill="currentColor" stroke="none">
      <path d="M11 3a9 9 0 109.95 10H11V3z" />
      <path d="M13 2a9 9 0 019 9h-9V2z" />
    </g>
  ),
  'cart.fill': (
    <g fill="currentColor" stroke="none">
      <path d="M3 4h2.5l2.2 10.5a1.5 1.5 0 001.5 1.2h8.6a1.5 1.5 0 001.4-1l2.3-6.7H7" />
      <circle cx="10" cy="20" r="1.7" />
      <circle cx="17" cy="20" r="1.7" />
    </g>
  ),
  'calendar.badge.clock': (
    <g>
      <rect x="3" y="5" width="15" height="14" rx="2" />
      <path d="M3 10h15M7 3v4M14 3v4" />
      <circle cx="18" cy="17" r="4" fill="var(--color-surface)" />
      <path d="M18 15v2l1.5 1" />
    </g>
  ),
  'banknote.fill': (
    <g>
      <rect x="2" y="6" width="20" height="12" rx="2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="3" fill="var(--color-surface)" stroke="none" />
    </g>
  ),
  faceid: (
    <g>
      <path d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M4 16v2a2 2 0 002 2h2M16 20h2a2 2 0 002-2v-2" />
      <path d="M9 9.5v1M15 9.5v1M12 9v4h-1M9 15.5a4 4 0 006 0" />
    </g>
  ),
  xmark: <path d="M6 6l12 12M18 6L6 18" />,
  'line.3.horizontal': <path d="M4 7h16M4 12h16M4 17h16" />,
}
