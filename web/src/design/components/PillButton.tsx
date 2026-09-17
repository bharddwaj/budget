import type { CSSProperties } from 'react'
import { Icon, type IconName } from '../Icon'

export type PillStyle = 'primary' | 'secondary' | 'quiet' | 'destructive'

interface PillButtonProps {
  title: string
  style?: PillStyle
  icon?: IconName
  isEnabled?: boolean
  onClick: () => void
}

/** The full-width rounded button that drives every primary action. */
export function PillButton({ title, style = 'primary', icon, isEnabled = true, onClick }: PillButtonProps) {
  return (
    <button type="button" className={`pill pill--${style}`} disabled={!isEnabled} onClick={onClick}>
      {icon ? <Icon name={icon} size={18} strokeWidth={2.4} /> : null}
      <span>{title}</span>
    </button>
  )
}

interface ChipButtonProps {
  title: string
  icon?: IconName
  isSelected?: boolean
  tint?: string
  onClick: () => void
}

/** A small tappable capsule used for filters, pickers and keypad shortcuts. */
export function ChipButton({ title, icon, isSelected = false, tint, onClick }: ChipButtonProps) {
  const style: CSSProperties = {}
  if (tint) (style as Record<string, string>)['--chip-tint'] = tint
  return (
    <button
      type="button"
      className={`chip ${isSelected ? 'chip--selected' : ''}`}
      style={style}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      {icon ? <Icon name={icon} size={12} strokeWidth={3} /> : null}
      <span>{title}</span>
    </button>
  )
}
