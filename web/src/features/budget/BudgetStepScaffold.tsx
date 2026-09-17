import type { ReactNode } from 'react'

interface ScaffoldProps {
  title?: string
  subtitle?: string
  children: ReactNode
  actions: ReactNode
  contentGap?: number
}

/** Shared chrome for the flow's screens: a heading, scrollable content, and a pinned button bar. */
export function BudgetStepScaffold({ title, subtitle, children, actions, contentGap }: ScaffoldProps) {
  return (
    <>
      <div className="screen__body">
        <div className="screen__content screen__content--no-tabs" style={contentGap !== undefined ? { gap: contentGap } : undefined}>
          {title ? (
            <div className="step-heading">
              <h1 className="step-heading__title">{title}</h1>
              {subtitle ? <p className="step-heading__subtitle">{subtitle}</p> : null}
            </div>
          ) : null}
          {children}
        </div>
      </div>
      <div className="pinned-actions">{actions}</div>
    </>
  )
}
