import { useReducer } from 'react'
import { useCurrencyFormat, useSnapshot, useStore } from '../../app/AppEnvironment'
import { createBudget } from '../../data/store/ops'
import { NavBar, NavTextButton } from '../../design/components/NavBar'
import { BudgetAllocationStep } from './BudgetAllocationStep'
import { BudgetOverviewStep } from './BudgetOverviewStep'
import { BudgetReviewStep } from './BudgetReviewStep'
import { BudgetScheduleStep } from './BudgetScheduleStep'
import { StepIndicator } from './StepIndicator'
import { budgetFlowReducer, deltaFor, initialBudgetFlow } from './budgetFlow'
import './budget.css'

interface Props {
  onClose: () => void
}

/** The budget flow: check your money, confirm your schedule, stuff your envelopes, review, done. */
export function BudgetFlowView({ onClose }: Props) {
  const store = useStore()
  const snapshot = useSnapshot()
  const format = useCurrencyFormat()
  const [state, dispatch] = useReducer(budgetFlowReducer, undefined, () =>
    initialBudgetFlow(store.getSnapshot(), store.clock().today, format),
  )

  function create() {
    const entries = state.envelopes.map((envelope) => ({
      envelopeID: envelope.id,
      amount: deltaFor(state, envelope),
      suggested: state.suggestions.get(envelope.id)?.amount ?? 0,
    }))
    store.commit(
      createBudget(store.getSnapshot(), state.totalCash, state.frequency, state.startDate, state.nextBudgetDate, entries, store.clock()).changes,
    )
    onClose()
  }

  return (
    <div className="screen">
      <NavBar inSheet leading={<NavTextButton title="Cancel" quiet onClick={onClose} />} title={<StepIndicator step={state.step} />} />
      {state.step === 'overview' ? (
        <BudgetOverviewStep state={state} dispatch={dispatch} onAdvance={() => dispatch({ type: 'advance', snapshot, format })} />
      ) : null}
      {state.step === 'schedule' ? (
        <BudgetScheduleStep state={state} dispatch={dispatch} onAdvance={() => dispatch({ type: 'advance', snapshot, format })} onBack={() => dispatch({ type: 'goBack' })} />
      ) : null}
      {state.step === 'allocate' ? <BudgetAllocationStep state={state} dispatch={dispatch} /> : null}
      {state.step === 'review' ? <BudgetReviewStep state={state} dispatch={dispatch} onCreate={create} /> : null}
    </div>
  )
}
