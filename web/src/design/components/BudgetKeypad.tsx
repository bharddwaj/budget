import { formatMoney } from '../../domain/currencyFormat'
import { hasPendingOperation, type KeypadKey, type KeypadState } from '../../domain/keypadEngine'
import type { Money } from '../../domain/money'
import { useCurrencyFormat } from '../../app/AppEnvironment'
import { Icon } from '../Icon'
import { AmountText } from './AmountText'
import { ChipButton } from './PillButton'

interface BudgetKeypadProps {
  /**
   * Called per key. Owners apply it with a functional state update
   * (`setState(prev => press(prev, key, suggested))`) so rapid taps can never
   * read a stale value.
   */
  onPress: (key: KeypadKey) => void
  /** The engine's recommendation; null hides the `suggested` chip. */
  suggested?: Money | null
  showsEmpty?: boolean
}

type KeyDef = { key: KeypadKey; label: string; operation?: boolean; aria?: string }

const rows: (KeyDef | null)[][] = [
  [
    { key: { type: 'digit', digit: 1 }, label: '1' },
    { key: { type: 'digit', digit: 2 }, label: '2' },
    { key: { type: 'digit', digit: 3 }, label: '3' },
    { key: { type: 'add' }, label: '+', operation: true, aria: 'Plus' },
  ],
  [
    { key: { type: 'digit', digit: 4 }, label: '4' },
    { key: { type: 'digit', digit: 5 }, label: '5' },
    { key: { type: 'digit', digit: 6 }, label: '6' },
    { key: { type: 'subtract' }, label: '−', operation: true, aria: 'Minus' },
  ],
  [
    { key: { type: 'digit', digit: 7 }, label: '7' },
    { key: { type: 'digit', digit: 8 }, label: '8' },
    { key: { type: 'digit', digit: 9 }, label: '9' },
    { key: { type: 'equals' }, label: '=', operation: true, aria: 'Equals' },
  ],
  [
    { key: { type: 'doubleZero' }, label: '00' },
    { key: { type: 'digit', digit: 0 }, label: '0' },
    { key: { type: 'delete' }, label: '⌫', operation: true, aria: 'Delete' },
    null,
  ],
]

/** The 4×4 stuffing keypad with its optional `suggested` / `empty` shortcuts. */
export function BudgetKeypad({ onPress, suggested = null, showsEmpty = true }: BudgetKeypadProps) {
  const showsChips = suggested !== null || showsEmpty
  return (
    <div className="keypad">
      {showsChips ? (
        <div className="keypad__chips">
          {suggested !== null ? (
            <ChipButton title="suggested" icon="sparkles" onClick={() => onPress({ type: 'suggested' })} />
          ) : null}
          {showsEmpty ? (
            <ChipButton title="empty" icon="circle.slash" onClick={() => onPress({ type: 'empty' })} />
          ) : null}
        </div>
      ) : null}
      <div className="keypad__grid">
        {rows.flat().map((def, index) =>
          def === null ? (
            <div key={`blank-${index}`} />
          ) : (
            <button
              key={def.label}
              type="button"
              className={`key ${def.operation ? 'key--operation' : ''}`}
              aria-label={def.aria ?? def.label}
              onClick={() => onPress(def.key)}
            >
              {def.key.type === 'delete' ? <Icon name="delete.left" size={26} strokeWidth={2} /> : def.label}
            </button>
          ),
        )}
      </div>
    </div>
  )
}

interface KeypadDisplayProps {
  state: KeypadState
  caption?: string | null
}

/** The large amount above the keypad, with the pending expression when one is in flight. */
export function KeypadDisplay({ state, caption }: KeypadDisplayProps) {
  const format = useCurrencyFormat()
  const expression =
    hasPendingOperation(state) && state.pendingValue !== null
      ? `${formatMoney(format, state.pendingValue)} ${state.pendingOperation === 'add' ? '+' : '−'}`
      : null
  return (
    <div className="keypad-display">
      {expression ? <span className="keypad-display__expression">{expression}</span> : null}
      <AmountText amount={state.value} font="t-hero" />
      {caption ? <span className="keypad-display__caption">{caption}</span> : null}
    </div>
  )
}
