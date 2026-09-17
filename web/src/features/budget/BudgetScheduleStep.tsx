import { useSnapshot, useCurrencyFormat } from '../../app/AppEnvironment'
import { BUDGET_FREQUENCIES, frequencyTitle } from '../../domain/budgetFrequency'
import { Icon } from '../../design/Icon'
import { CardSurface } from '../../design/components/CardSurface'
import { SectionHeader } from '../../design/components/EmojiBadge'
import { DatePicker } from '../../design/components/MonthCalendarGrid'
import { PillButton } from '../../design/components/PillButton'
import { BudgetStepScaffold } from './BudgetStepScaffold'
import type { BudgetFlowAction, BudgetFlowState } from './budgetFlow'

interface Props {
  state: BudgetFlowState
  dispatch: (action: BudgetFlowAction) => void
  onAdvance: () => void
  onBack: () => void
}

/**
 * Step 2 — when the next budget lands and how often you budget. The frequency
 * chosen here is the divisor behind every suggested amount on the next screen.
 */
export function BudgetScheduleStep({ state, dispatch, onAdvance, onBack }: Props) {
  const snapshot = useSnapshot()
  const format = useCurrencyFormat()
  return (
    <BudgetStepScaffold
      title="When's your next budget?"
      subtitle="Usually your next payday. We'll remind you when it comes around."
      actions={
        <>
          <PillButton title="yup, looks right" onClick={onAdvance} />
          <PillButton title="previous" style="quiet" onClick={onBack} />
        </>
      }
    >
      <CardSurface>
        <div className="vstack" style={{ gap: 'var(--space-medium)' }}>
          <SectionHeader title="Next budget date" />
          <DatePicker value={state.nextBudgetDate} minDay={state.startDate} onChange={(date) => dispatch({ type: 'setNextBudgetDate', date })} />
        </div>
      </CardSurface>

      <CardSurface>
        <div className="vstack" style={{ gap: 'var(--space-small)' }}>
          <SectionHeader title="How often do you budget?" />
          {BUDGET_FREQUENCIES.map((frequency, index) => (
            <div key={frequency}>
              <button type="button" className="option-row" onClick={() => dispatch({ type: 'setFrequency', frequency, snapshot, format })}>
                <span className="t-body c-primary">{frequencyTitle(frequency)}</span>
                <span className={`option-row__check ${state.frequency === frequency ? 'option-row__check--on' : 'option-row__check--off'}`}>
                  <Icon name={state.frequency === frequency ? 'checkmark.circle.fill' : 'circle'} size={22} />
                </span>
              </button>
              {index < BUDGET_FREQUENCIES.length - 1 ? <div className="divider" /> : null}
            </div>
          ))}
        </div>
      </CardSurface>
    </BudgetStepScaffold>
  )
}
