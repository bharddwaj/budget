import type { CSSProperties, ReactNode } from 'react'

interface CardSurfaceProps {
  children: ReactNode
  padding?: number
  background?: string
  className?: string
  style?: CSSProperties
  onClick?: () => void
}

/** The rounded white panel almost every group of content sits on. */
export function CardSurface({ children, padding, background, className, style, onClick }: CardSurfaceProps) {
  const vars: CSSProperties = { ...style }
  if (padding !== undefined) (vars as Record<string, string>)['--card-padding'] = `${padding}px`
  if (background) (vars as Record<string, string>)['--card-background'] = background
  if (onClick) {
    return (
      <button type="button" className={`card ${className ?? ''}`} style={vars} onClick={onClick}>
        {children}
      </button>
    )
  }
  return (
    <div className={`card ${className ?? ''}`} style={vars}>
      {children}
    </div>
  )
}
