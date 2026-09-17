import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface SheetProps {
  isOpen: boolean
  onDismiss: () => void
  children: ReactNode
  /** `cover` fills the screen like a fullScreenCover; `medium` hugs its content. */
  presentation?: 'sheet' | 'cover' | 'medium'
}

/** A bottom sheet or full-screen cover, rendered above the tab shell. */
export function Sheet({ isOpen, onDismiss, children, presentation = 'sheet' }: SheetProps) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onDismiss])

  if (!isOpen) return null
  return createPortal(
    <>
      {presentation !== 'cover' ? <div className="sheet-backdrop" onClick={onDismiss} /> : null}
      <div className={`sheet sheet--${presentation}`} role="dialog" aria-modal="true">
        <div className="sheet__body">{children}</div>
      </div>
    </>,
    document.body,
  )
}
