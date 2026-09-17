import { useState } from 'react'
import { commit, keypadState, press } from '../../domain/keypadEngine'
import type { Money } from '../../domain/money'
import { BudgetKeypad, KeypadDisplay } from './BudgetKeypad'
import { NavBar, NavTextButton } from './NavBar'
import { PillButton } from './PillButton'
import { Sheet } from './Sheet'

interface AmountEntrySheetProps {
  isOpen: boolean
  title: string
  caption?: string
  amount: Money
  onDone: (amount: Money) => void
  onCancel: () => void
}

/**
 * A small keypad sheet for editing one amount — used for reconciling your cash
 * total, setting a bill amount, and entering a savings goal.
 */
export function AmountEntrySheet({ isOpen, title, caption, amount, onDone, onCancel }: AmountEntrySheetProps) {
  return (
    <Sheet isOpen={isOpen} onDismiss={onCancel}>
      {isOpen ? <AmountEntryBody title={title} caption={caption} amount={amount} onDone={onDone} onCancel={onCancel} /> : null}
    </Sheet>
  )
}

function AmountEntryBody({ title, caption, amount, onDone, onCancel }: Omit<AmountEntrySheetProps, 'isOpen'>) {
  const [state, setState] = useState(() => keypadState(amount))
  return (
    <div className="screen">
      <NavBar inSheet title={title} trailing={<NavTextButton title="Cancel" quiet onClick={onCancel} />} />
      <div className="screen__body">
        <div className="screen__content screen__content--no-tabs" style={{ paddingTop: 'var(--space-large)' }}>
          <KeypadDisplay state={state} caption={caption} />
          <BudgetKeypad onPress={(key) => setState((prev) => press(prev, key))} suggested={null} showsEmpty={false} />
        </div>
      </div>
      <div className="pinned-actions">
        <PillButton title="done" onClick={() => onDone(commit(state).value)} />
      </div>
    </div>
  )
}
