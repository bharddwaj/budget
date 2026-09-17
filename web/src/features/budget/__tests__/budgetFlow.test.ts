import { describe, expect, it } from 'vitest'
import { applyChangeSet } from '../../../data/changeSet'
import { emptySnapshot } from '../../../data/defaults'
import { completeOnboarding, createBudget, record } from '../../../data/store/ops'
import { USD } from '../../../domain/currencyFormat'
import {
  budgetFlowReducer,
  currentEnvelope,
  initialBudgetFlow,
  isFullyAllocated,
  remaining,
  suggestedTarget,
} from '../budgetFlow'

const clock = { today: '2026-09-10', now: Date.UTC(2026, 8, 10) }

function onboarded() {
  const starters = [
    { emoji: '🛒', name: 'Groceries', kind: 'variable' as const },
    { emoji: '🏠', name: 'Rent', kind: 'fixed' as const },
  ]
  return applyChangeSet(emptySnapshot(), completeOnboarding(emptySnapshot(), starters, 'monthly', 250000, clock))
}

describe('budgetFlow', () => {
  it('starts the first budget from onboarding cash with every envelope at zero', () => {
    const snapshot = onboarded()
    const state = initialBudgetFlow(snapshot, '2026-09-10', USD)
    expect(state.totalCash).toBe(250000)
    expect(state.frequency).toBe('monthly')
    expect(state.nextBudgetDate).toBe('2026-10-10')
    expect(remaining(state)).toBe(250000)
    expect(state.previousCycle).toBeNull()
  })

  it('walks the stuffing loop to zero and unlocks review', () => {
    const snapshot = onboarded()
    let state = initialBudgetFlow(snapshot, '2026-09-10', USD)
    state = budgetFlowReducer(state, { type: 'advance', snapshot, format: USD })
    state = budgetFlowReducer(state, { type: 'advance', snapshot, format: USD })
    expect(state.step).toBe('allocate')
    expect(currentEnvelope(state)?.name).toBe('Groceries')

    // Typing updates "remaining" live.
    state = budgetFlowReducer(state, { type: 'setTarget', envelopeID: currentEnvelope(state)!.id, target: 50000 })
    expect(remaining(state)).toBe(200000)

    state = budgetFlowReducer(state, { type: 'commitAndAdvance', target: 50000 })
    expect(currentEnvelope(state)?.name).toBe('Rent')
    expect(isFullyAllocated(state)).toBe(false)

    state = budgetFlowReducer(state, { type: 'commitAndAdvance', target: 200000 })
    expect(state.step).toBe('review')
    expect(isFullyAllocated(state)).toBe(true)
  })

  it('later budgets start from envelope balances and carry the previous frequency', () => {
    let snapshot = onboarded()
    const ids = Object.keys(snapshot.envelopes)
    snapshot = applyChangeSet(
      snapshot,
      createBudget(snapshot, 250000, 'monthly', '2026-08-10', '2026-09-10', ids.map((id) => ({ envelopeID: id, amount: 125000, suggested: 0 })), clock).changes,
    )
    snapshot = applyChangeSet(snapshot, record(snapshot, { amount: 30000, kind: 'expense', date: '2026-08-20', envelopeID: ids[0]! }, clock).changes)

    const state = initialBudgetFlow(snapshot, '2026-09-10', USD)
    expect(state.totalCash).toBe(220000)
    expect(state.previousCycle).not.toBeNull()
    expect(state.spentSinceLastBudget).toBe(30000)
    expect(state.frequency).toBe('monthly')
  })

  it('changing frequency re-derives the next date and suggestions', () => {
    let snapshot = onboarded()
    const rentID = Object.values(snapshot.envelopes).find((e) => e.kind === 'fixed')!.id
    snapshot = {
      ...snapshot,
      envelopes: {
        ...snapshot.envelopes,
        [rentID]: { ...snapshot.envelopes[rentID]!, billAmountMinorUnits: 120000, billDueDate: '2026-10-05' },
      },
    }
    let state = initialBudgetFlow(snapshot, '2026-09-10', USD)
    const rent = snapshot.envelopes[rentID]!
    // Monthly: one budget before Oct 5 → whole bill.
    expect(suggestedTarget(state, rent)).toBe(120000)
    state = budgetFlowReducer(state, { type: 'setFrequency', frequency: 'weekly', snapshot, format: USD })
    expect(state.nextBudgetDate).toBe('2026-09-17')
    // Weekly: Sep 10, 17, 24, Oct 1 → four budgets.
    expect(suggestedTarget(state, rent)).toBe(30000)
  })

  it('jumping from the strip commits the current target', () => {
    const snapshot = onboarded()
    let state = initialBudgetFlow(snapshot, '2026-09-10', USD)
    state = budgetFlowReducer(state, { type: 'advance', snapshot, format: USD })
    state = budgetFlowReducer(state, { type: 'advance', snapshot, format: USD })
    const first = currentEnvelope(state)!
    state = budgetFlowReducer(state, { type: 'commitAndJump', target: 12345, index: 1 })
    expect(state.targets[first.id]).toBe(12345)
    expect(state.allocationIndex).toBe(1)
  })
})
