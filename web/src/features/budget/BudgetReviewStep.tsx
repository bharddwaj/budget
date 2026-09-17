import { ENVELOPE_KIND_ORDER, kindSectionTitle } from '../../domain/envelopeKind'
import { formatDay } from '../../domain/dates'
import { Icon } from '../../design/Icon'
import { kindColor } from '../../design/kinds'
import { AmountText } from '../../design/components/AmountText'
import { CardSurface } from '../../design/components/CardSurface'
import { EmojiBadge, SectionHeader } from '../../design/components/EmojiBadge'
import { PillButton } from '../../design/components/PillButton'
import { BudgetStepScaffold } from './BudgetStepScaffold'
import { allocatedTotal, deltaFor, isFullyAllocated, remaining, targetFor, type BudgetFlowAction, type BudgetFlowState } from './budgetFlow'

interface Props {
  state: BudgetFlowState
  dispatch: (action: BudgetFlowAction) => void
  onCreate: () => void
}

/**
 * Step 4 — one last look before the budget is committed. "create budget"
 * stays disabled while anything is still unplaced.
 */
export function BudgetReviewStep({ state, dispatch, onCreate }: Props) {
  const complete = isFullyAllocated(state)
  return (
    <BudgetStepScaffold
      title="Look good?"
      subtitle="Tap any envelope to change it."
      actions={
        <>
          <PillButton title="create budget" isEnabled={complete} onClick={onCreate} />
          <PillButton title="previous" style="quiet" onClick={() => dispatch({ type: 'goToStep', step: 'allocate' })} />
        </>
      }
    >
      <CardSurface>
        <div className="vstack" style={{ gap: 'var(--space-medium)' }}>
          <TotalRow label="you have"><AmountText amount={state.totalCash} font="t-headline" /></TotalRow>
          <div className="divider" />
          <TotalRow label="you're stuffing"><AmountText amount={allocatedTotal(state)} font="t-headline" /></TotalRow>
          <div className="divider" />
          <TotalRow label="left over">
            <AmountText amount={remaining(state)} font="t-headline" color={complete ? 'var(--color-positive)' : 'var(--color-negative)'} />
          </TotalRow>
          <div className="divider" />
          <TotalRow label="next budget">
            <span className="t-headline c-primary">{formatDay(state.nextBudgetDate, 'weekdayMonthDay')}</span>
          </TotalRow>
        </div>
      </CardSurface>

      {ENVELOPE_KIND_ORDER.map((kind) => {
        const group = state.envelopes.map((envelope, index) => ({ envelope, index })).filter((entry) => entry.envelope.kind === kind)
        if (group.length === 0) return null
        return (
          <div key={kind} className="vstack" style={{ gap: 'var(--space-small)' }}>
            <SectionHeader title={kindSectionTitle(kind)} tint={kindColor(kind)} />
            <CardSurface>
              {group.map(({ envelope, index }, position) => {
                const delta = deltaFor(state, envelope)
                return (
                  <div key={envelope.id}>
                    <button type="button" className="review-row" onClick={() => dispatch({ type: 'commitAndJump', target: targetFor(state, envelope), index })}>
                      <EmojiBadge emoji={envelope.emoji} tint={kindColor(kind)} size={38} />
                      <div className="review-row__body">
                        <span className="row__title">{envelope.name}</span>
                        {delta !== 0 ? (
                          <AmountText amount={delta} font="t-caption" showsSign colorBySign />
                        ) : (
                          <span className="row__subtitle">unchanged</span>
                        )}
                      </div>
                      <AmountText amount={targetFor(state, envelope)} font="t-headline" />
                      <span className="review-row__chevron">
                        <Icon name="chevron.right" size={12} strokeWidth={3} />
                      </span>
                    </button>
                    {position < group.length - 1 ? <div className="divider" /> : null}
                  </div>
                )
              })}
            </CardSurface>
          </div>
        )
      })}

      {!complete ? (
        <CardSurface background="color-mix(in srgb, var(--color-warning) 12%, transparent)">
          <div className="hint hint--warning">
            <Icon name="exclamationmark.triangle.fill" size={18} className="icon" />
            <span>Every dollar needs a home before you can create this budget. Head back and keep stuffing.</span>
          </div>
        </CardSurface>
      ) : null}
    </BudgetStepScaffold>
  )
}

function TotalRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="hstack" style={{ justifyContent: 'space-between', gap: 'var(--space-medium)' }}>
      <span className="t-body c-secondary">{label}</span>
      {children}
    </div>
  )
}
