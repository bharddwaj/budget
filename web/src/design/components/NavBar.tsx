import type { ReactNode } from 'react'
import { Icon, type IconName } from '../Icon'

interface NavBarProps {
  title?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
  /** Sheets sit below the status bar, so they skip the safe-area top padding. */
  inSheet?: boolean
}

export function NavBar({ title, leading, trailing, inSheet = false }: NavBarProps) {
  return (
    <div className={`navbar ${inSheet ? 'navbar--sheet' : ''}`}>
      <div className="navbar__leading">{leading}</div>
      <div className="navbar__title">{title}</div>
      <div className="navbar__trailing">{trailing}</div>
    </div>
  )
}

export function NavTextButton({
  title,
  onClick,
  quiet = false,
}: {
  title: string
  onClick: () => void
  quiet?: boolean
}) {
  return (
    <button type="button" className={`navbar__text-button ${quiet ? 'navbar__text-button--quiet' : ''}`} onClick={onClick}>
      {title}
    </button>
  )
}

export function NavIconButton({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button type="button" className="navbar__icon-button" onClick={onClick} aria-label={label}>
      <Icon name={icon} size={20} strokeWidth={2.4} />
    </button>
  )
}
