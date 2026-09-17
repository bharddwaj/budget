import { useState } from 'react'
import { Icon } from '../../design/Icon'
import { AmountEntrySheet } from '../../design/components/AmountEntrySheet'
import { AmountText } from '../../design/components/AmountText'
import { CardSurface } from '../../design/components/CardSurface'
import { SectionHeader } from '../../design/components/EmojiBadge'
import { PillButton } from '../../design/components/PillButton'
import { BudgetStepScaffold } from './BudgetStepScaffold'
import type { BudgetFlowAction, BudgetFlowState } from './budgetFlow'

interface Props {
  state: BudgetFlowState
  dispatch: (action: BudgetFlowAction) => void
  onAdvance: () => void
}

/** Step 1 — check the money you're about to stuff. */
export function BudgetOverviewStep({ state, dispatch, onAdvance }: Props) {
  const [isEditing, setEditing] = useState(false)
  return (
    <BudgetStepScaffold
      title="Let's look at your money"
      subtitle="Check this matches your accounts before you stuff anything."
      actions={<PillButton title="stuff your money" onClick={onAdvance} />}
    >
      {state.previousCycle ? (
        <CardSurface>
          <div className="vstack" style={{ gap: 'var(--space-medium)' }}>
            <SectionHeader title="Since your last budget" />
            <SummaryRow emoji="🗓️" label="You started with" amount={state.previousCycle.startingBalanceMinorUnits} color="var(--color-text-primary)" />
            <div className="divider" />
            <SummaryRow emoji="💸" label="You spent" amount={state.spentSinceLastBudget} color="var(--color-negative)" />
            <div className="divider" />
            <SummaryRow emoji="💰" label="You made" amount={state.incomeSinceLastBudget} color="var(--color-positive)" />
          </div>
        </CardSurface>
      ) : null}

      <CardSurface background="var(--color-accent-soft)" padding={22} onClick={() => setEditing(true)}>
        <div className="total-card">
          <span className="total-card__label">you have</span>
          <AmountText amount={state.totalCash} font="t-hero" />
          <span className="total-card__edit">
            <Icon name="pencil" size={12} strokeWidth={2.4} />
            tap to correct
          </span>
        </div>
      </CardSurface>

      <CardSurface background="var(--color-surface-muted)">
        <div className="hint">
          <Icon name="info.circle.fill" size={18} className="icon" />
          <span>If you missed logging something, close this and add it first — then this total will line up on its own.</span>
        </div>
      </CardSurface>

      <AmountEntrySheet
        isOpen={isEditing}
        title="How much do you have?"
        caption="Every bank account, plus any cash in your wallet."
        amount={state.totalCash}
        onDone={(amount) => {
          dispatch({ type: 'setTotalCash', amount })
          setEditing(false)
        }}
        onCancel={() => setEditing(false)}
      />
    </BudgetStepScaffold>
  )
}

function SummaryRow({ emoji, label, amount, color }: { emoji: string; label: string; amount: number; color: string }) {
  return (
    <div className="summary-row">
      <span className="emoji">{emoji}</span>
      <span className="summary-row__label">{label}</span>
      <AmountText amount={amount} font="t-headline" color={color} />
    </div>
  )
}
