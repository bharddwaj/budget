import type { CSSProperties, ReactNode } from 'react'

interface EmojiBadgeProps {
  emoji: string
  tint: string
  size?: number
}

/** An envelope's emoji in a soft tinted circle — the app's main iconography. */
export function EmojiBadge({ emoji, tint, size = 44 }: EmojiBadgeProps) {
  const style = { width: size, height: size, '--badge-tint': tint } as CSSProperties
  return (
    <span className="badge" style={style} aria-hidden>
      <span className="emoji" style={{ fontSize: size * 0.5 }}>
        {emoji}
      </span>
    </span>
  )
}

interface SectionHeaderProps {
  title: string
  tint?: string
  trailing?: ReactNode
}

/** The small uppercase label above a group, optionally with a trailing value. */
export function SectionHeader({ title, tint, trailing }: SectionHeaderProps) {
  const style = tint ? ({ '--section-tint': tint } as CSSProperties) : undefined
  return (
    <div className="section-header" style={style}>
      <span className="section-header__title">{title}</span>
      {trailing !== undefined && trailing !== null ? (
        <span className="section-header__trailing">{trailing}</span>
      ) : null}
    </div>
  )
}
