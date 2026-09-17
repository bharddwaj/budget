import { activeCycle, sortedEnvelopes, suggestionSnapshot, transactionsNewestFirst } from '../../data/store/derive'
import type { BudgetCycleRecord, EnvelopeRecord, Id, Snapshot } from '../../data/types'
import type { BudgetFrequency } from '../../domain/budgetFrequency'
import type { CurrencyFormat } from '../../domain/currencyFormat'
import { nextBudgetDate } from '../../domain/cycleCalendar'
import type { DayKey } from '../../domain/dates'
import type { EnvelopeKind } from '../../domain/envelopeKind'
import { total, type Money } from '../../domain/money'
import { suggestions, type Suggestion } from '../../domain/suggestionEngine'

/**
 * State for the four-screen budget flow — a port of BudgetFlowModel.
 *
 * The stuffing screen works in **target balances**, not top-ups: each envelope
 * shows what it will hold when the budget is done, starting from what it holds
 * now. That is what makes "remaining" reach exactly $0.00 — every dollar you
 * have is either sitting in an envelope already or waiting to be put in one.
 */
export type Step = 'overview' | 'schedule' | 'allocate' | 'review'
export const STEPS: readonly Step[] = ['overview', 'schedule', 'allocate', 'review']

export interface BudgetFlowState {
  step: Step
  /** Total cash across all accounts, editable on the first screen. */
  totalCash: Money
  frequency: BudgetFrequency
  startDate: DayKey
  nextBudgetDate: DayKey
  /** Target balance per envelope, keyed by envelope id. */
  targets: Record<Id, Money>
  /** Which envelope the stuffing screen is currently on. */
  allocationIndex: number
  envelopes: EnvelopeRecord[]
  suggestions: Map<Id, Suggestion>
  previousCycle: BudgetCycleRecord | null
  spentSinceLastBudget: Money
  incomeSinceLastBudget: Money
}

export function initialBudgetFlow(snapshot: Snapshot, today: DayKey, format: CurrencyFormat): BudgetFlowState {
  const previous = activeCycle(snapshot)
  const frequency = previous?.frequency ?? snapshot.settings.preferredFrequency
  const envelopes = sortedEnvelopes(snapshot)

  // What you actually have is what's in the envelopes right now, which the
  // user can correct on the first screen. The very first budget also has the
  // cash entered during onboarding to place.
  const inEnvelopes = total(envelopes.map((e) => e.balanceMinorUnits))
  const totalCash = previous === null ? inEnvelopes + snapshot.settings.startingCashMinorUnits : inEnvelopes

  const targets: Record<Id, Money> = {}
  for (const envelope of envelopes) targets[envelope.id] = envelope.balanceMinorUnits

  let spent = 0
  let income = 0
  if (previous) {
    for (const t of transactionsNewestFirst(snapshot, previous.startDate, today)) {
      if (t.kind === 'expense') spent += t.amountMinorUnits
      if (t.kind === 'income') income += t.amountMinorUnits
    }
  }

  return {
    step: 'overview',
    totalCash,
    frequency,
    startDate: today,
    nextBudgetDate: nextBudgetDate(today, frequency),
    targets,
    allocationIndex: 0,
    envelopes,
    suggestions: computeSuggestions(snapshot, envelopes, today, frequency, format),
    previousCycle: previous,
    spentSinceLastBudget: spent,
    incomeSinceLastBudget: income,
  }
}

function computeSuggestions(
  snapshot: Snapshot,
  envelopes: EnvelopeRecord[],
  asOf: DayKey,
  frequency: BudgetFrequency,
  format: CurrencyFormat,
): Map<Id, Suggestion> {
  return suggestions(
    envelopes.map((e) => suggestionSnapshot(snapshot, e, asOf)),
    asOf,
    frequency,
    format,
  )
}

// MARK: - Derived

export function currentEnvelope(state: BudgetFlowState): EnvelopeRecord | null {
  return state.envelopes[state.allocationIndex] ?? null
}

export function allocatedTotal(state: BudgetFlowState): Money {
  return total(state.envelopes.map((e) => state.targets[e.id] ?? 0))
}

/** What is left to place. The review step unlocks when this is zero. */
export function remaining(state: BudgetFlowState): Money {
  return state.totalCash - allocatedTotal(state)
}

export function isFullyAllocated(state: BudgetFlowState): boolean {
  return remaining(state) === 0
}

/** The target balance offered by the `suggested` chip: what the envelope holds now plus the recommended top-up. */
export function suggestedTarget(state: BudgetFlowState, envelope: EnvelopeRecord): Money {
  return envelope.balanceMinorUnits + (state.suggestions.get(envelope.id)?.amount ?? 0)
}

export function rationale(state: BudgetFlowState, envelope: EnvelopeRecord): string | null {
  return state.suggestions.get(envelope.id)?.rationale ?? null
}

export function targetFor(state: BudgetFlowState, envelope: EnvelopeRecord): Money {
  return state.targets[envelope.id] ?? envelope.balanceMinorUnits
}

/** How much this budget is adding to (or taking out of) an envelope. */
export function deltaFor(state: BudgetFlowState, envelope: EnvelopeRecord): Money {
  return targetFor(state, envelope) - envelope.balanceMinorUnits
}

export function totalForKind(state: BudgetFlowState, kind: EnvelopeKind): Money {
  return total(state.envelopes.filter((e) => e.kind === kind).map((e) => state.targets[e.id] ?? 0))
}

// MARK: - Actions

export type BudgetFlowAction =
  | { type: 'setTotalCash'; amount: Money }
  | { type: 'setNextBudgetDate'; date: DayKey }
  | { type: 'setFrequency'; frequency: BudgetFrequency; snapshot: Snapshot; format: CurrencyFormat }
  | { type: 'advance'; snapshot: Snapshot; format: CurrencyFormat }
  | { type: 'goBack' }
  | { type: 'setTarget'; envelopeID: Id; target: Money }
  | { type: 'commitAndAdvance'; target: Money }
  | { type: 'commitAndJump'; target: Money; index: number }
  | { type: 'stepBackInAllocation' }
  | { type: 'goToStep'; step: Step }

export function budgetFlowReducer(state: BudgetFlowState, action: BudgetFlowAction): BudgetFlowState {
  switch (action.type) {
    case 'setTotalCash':
      return { ...state, totalCash: action.amount }
    case 'setNextBudgetDate':
      return { ...state, nextBudgetDate: action.date }
    case 'setFrequency': {
      // Every rule divides by the number of budgets left before a date, so
      // changing the rhythm re-runs the suggestions immediately.
      return {
        ...state,
        frequency: action.frequency,
        nextBudgetDate: nextBudgetDate(state.startDate, action.frequency),
        suggestions: computeSuggestions(action.snapshot, state.envelopes, state.startDate, action.frequency, action.format),
      }
    }
    case 'advance': {
      const index = STEPS.indexOf(state.step)
      const next = STEPS[index + 1]
      if (!next) return state
      let updated = { ...state, step: next }
      if (next === 'schedule') {
        updated = { ...updated, nextBudgetDate: nextBudgetDate(state.startDate, state.frequency) }
      }
      if (next === 'allocate') {
        updated = {
          ...updated,
          allocationIndex: 0,
          suggestions: computeSuggestions(action.snapshot, state.envelopes, state.startDate, state.frequency, action.format),
        }
      }
      return updated
    }
    case 'goBack': {
      const index = STEPS.indexOf(state.step)
      const previous = STEPS[index - 1]
      return previous ? { ...state, step: previous } : state
    }
    case 'setTarget':
      return { ...state, targets: { ...state.targets, [action.envelopeID]: action.target } }
    case 'commitAndAdvance': {
      const envelope = currentEnvelope(state)
      if (!envelope) return state
      const targets = { ...state.targets, [envelope.id]: action.target }
      if (state.allocationIndex < state.envelopes.length - 1) {
        return { ...state, targets, allocationIndex: state.allocationIndex + 1 }
      }
      return { ...state, targets, step: 'review' }
    }
    case 'commitAndJump': {
      const envelope = currentEnvelope(state)
      const targets = envelope ? { ...state.targets, [envelope.id]: action.target } : state.targets
      if (action.index < 0 || action.index >= state.envelopes.length) return { ...state, targets }
      return { ...state, targets, allocationIndex: action.index, step: 'allocate' }
    }
    case 'stepBackInAllocation':
      if (state.allocationIndex > 0) return { ...state, allocationIndex: state.allocationIndex - 1 }
      return { ...state, step: 'schedule' }
    case 'goToStep':
      return { ...state, step: action.step }
  }
}
