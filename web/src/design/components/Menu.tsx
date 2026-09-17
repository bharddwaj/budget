import { useState, type ReactNode } from 'react'
import { Icon, type IconName } from '../Icon'
import { NavIconButton } from './NavBar'

export interface MenuItem {
  title: string
  icon: IconName
  destructive?: boolean
  onSelect: () => void
}

interface MenuProps {
  items: (MenuItem | 'divider')[]
  label?: string
}

/** The `…` action menu in a nav bar. */
export function Menu({ items, label = 'More' }: MenuProps) {
  const [isOpen, setOpen] = useState(false)
  return (
    <>
      <NavIconButton icon="ellipsis" label={label} onClick={() => setOpen(true)} />
      {isOpen ? (
        <>
          <div className="menu-backdrop" onClick={() => setOpen(false)} />
          <div className="menu" role="menu">
            {items.map((item, index) =>
              item === 'divider' ? (
                <div key={`divider-${index}`} className="menu__divider" />
              ) : (
                <button
                  key={item.title}
                  type="button"
                  role="menuitem"
                  className={`menu__item ${item.destructive ? 'menu__item--destructive' : ''}`}
                  onClick={() => {
                    setOpen(false)
                    item.onSelect()
                  }}
                >
                  <Icon name={item.icon} size={20} className="icon" />
                  <span>{item.title}</span>
                </button>
              ),
            )}
          </div>
        </>
      ) : null}
    </>
  )
}

export interface DialogAction {
  title: string
  destructive?: boolean
  onSelect: () => void
}

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  actions: DialogAction[]
  onCancel: () => void
  children?: ReactNode
}

/** A bottom action sheet, like SwiftUI's confirmationDialog. */
export function ConfirmDialog({ isOpen, title, actions, onCancel }: ConfirmDialogProps) {
  if (!isOpen) return null
  return (
    <>
      <div className="sheet-backdrop" style={{ zIndex: 49 }} onClick={onCancel} />
      <div className="dialog" role="alertdialog" aria-label={title}>
        <div className="dialog__group">
          <div className="dialog__title">{title}</div>
          {actions.map((action) => (
            <button
              key={action.title}
              type="button"
              className={`dialog__action ${action.destructive ? 'dialog__action--destructive' : ''}`}
              onClick={() => {
                onCancel()
                action.onSelect()
              }}
            >
              {action.title}
            </button>
          ))}
        </div>
        <div className="dialog__group">
          <button type="button" className="dialog__action" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}
