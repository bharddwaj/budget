import type { Money } from './money'

/** The keys on the budgeting keypad. */
export type KeypadKey =
  | { type: 'digit'; digit: number }
  | { type: 'doubleZero' }
  /** Backspace — removes the last typed digit, or clears the amount if none have been typed yet. */
  | { type: 'delete' }
  | { type: 'add' }
  | { type: 'subtract' }
  | { type: 'equals' }
  /** Fills in the engine-calculated recommendation for this envelope. */
  | { type: 'suggested' }
  /** Zeroes the envelope out without having to subtract its balance by hand. */
  | { type: 'empty' }

export type KeypadOperation = 'add' | 'subtract'

/**
 * The keypad's state, kept out of the view so it can be tested.
 *
 * Amounts are entered the way a cash register takes them: digits fill in from
 * the right, so `1`, `2`, `3` reads as $1.23. Pressing `+` or `-` parks the
 * current value and starts a fresh entry; `=` resolves it, which is what lets
 * someone add to an existing envelope balance without doing the mental math.
 */
export interface KeypadState {
  /** The amount currently shown on the big display. */
  value: Money
  /**
   * Set once the user starts typing over the incoming amount, so the first
   * digit replaces the balance rather than appending to it.
   */
  isTyping: boolean
  /** The parked left-hand side of a pending `+` / `-`. */
  pendingValue: Money | null
  pendingOperation: KeypadOperation | null
}

/** Largest amount the keypad accepts, guarding against runaway digit entry. */
export const MAXIMUM_MINOR_UNITS = 99_999_999_99

export function keypadState(value: Money = 0): KeypadState {
  return { value, isTyping: false, pendingValue: null, pendingOperation: null }
}

/** True while a `+` or `-` is waiting on `=`. */
export function hasPendingOperation(state: KeypadState): boolean {
  return state.pendingOperation !== null
}

export function press(state: KeypadState, key: KeypadKey, suggested: Money = 0): KeypadState {
  switch (key.type) {
    case 'digit':
      return appendDigits(state, String(Math.max(0, Math.min(9, key.digit))))
    case 'doubleZero':
      return appendDigits(state, '00')
    case 'delete':
      return deleteLastDigit(state)
    case 'add':
      return beginOperation(state, 'add')
    case 'subtract':
      return beginOperation(state, 'subtract')
    case 'equals':
      return resolvePendingOperation(state)
    case 'suggested':
      return replaceValue(suggested)
    case 'empty':
      return replaceValue(0)
  }
}

/**
 * Resolves any half-finished expression and returns the final amount, which is
 * what `next` commits to the envelope.
 */
export function commit(state: KeypadState): { state: KeypadState; value: Money } {
  const resolved = resolvePendingOperation(state)
  return { state: { ...resolved, isTyping: false }, value: resolved.value }
}

/** Loads the next envelope's balance in without carrying state across. */
export function reset(value: Money): KeypadState {
  return keypadState(value)
}

function appendDigits(state: KeypadState, digits: string): KeypadState {
  const existing = state.isTyping ? String(Math.abs(state.value)) : '0'
  const combined = (existing === '0' ? '' : existing) + digits
  const trimmed = combined.slice(0, 11)
  const parsed = Number.parseInt(trimmed, 10) || 0
  return { ...state, value: Math.min(parsed, MAXIMUM_MINOR_UNITS), isTyping: true }
}

function deleteLastDigit(state: KeypadState): KeypadState {
  if (!state.isTyping) {
    // Nothing typed yet: the first delete clears the incoming balance,
    // matching how the real keypad behaves on a fresh envelope.
    return { ...state, value: 0, isTyping: true }
  }
  const digits = String(Math.abs(state.value))
  const remaining = digits.slice(0, -1)
  return { ...state, value: Number.parseInt(remaining, 10) || 0 }
}

function beginOperation(state: KeypadState, operation: KeypadOperation): KeypadState {
  // Chaining without pressing equals resolves what came before first.
  const resolved = resolvePendingOperation(state)
  return { value: 0, isTyping: false, pendingValue: resolved.value, pendingOperation: operation }
}

function resolvePendingOperation(state: KeypadState): KeypadState {
  if (state.pendingOperation === null || state.pendingValue === null) return state
  const value =
    state.pendingOperation === 'add'
      ? state.pendingValue + state.value
      : state.pendingValue - state.value
  return { value, isTyping: false, pendingValue: null, pendingOperation: null }
}

function replaceValue(value: Money): KeypadState {
  return { value, isTyping: false, pendingValue: null, pendingOperation: null }
}
