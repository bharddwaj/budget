import { describe, expect, it } from 'vitest'
import { emptySnapshot } from '../../defaults'
import { activeCycle, sortedEnvelopes, transactionsNewestFirst } from '../derive'
import {
  changeKind,
  completeOnboarding,
  createBudget,
  createEnvelope,
  deleteEnvelope,
  deleteTransaction,
  merge,
  record,
  reorder,
  setRetired,
  startFresh,
  transfer,
  updateTransaction,
} from '../ops'
import { apply, clock, seeded } from './fixtures'

describe('createEnvelope', () => {
  it('assigns the next sort index within the kind and default off-limits by kind', () => {
    const { snapshot, groceries, rent } = seeded()
    expect(groceries.sortIndex).toBe(0)
    expect(rent.sortIndex).toBe(0)
    expect(groceries.isOffLimitsForNoSpend).toBe(true)
    expect(rent.isOffLimitsForNoSpend).toBe(false)

    const gas = createEnvelope(snapshot, '⛽️', 'Gas', 'variable', clock)
    expect(gas.envelope.sortIndex).toBe(1)
  })

  it('orders envelopes by kind then sort index', () => {
    const { snapshot } = seeded()
    expect(sortedEnvelopes(snapshot).map((e) => e.name)).toEqual(['Groceries', 'Rent', 'Trip'])
  })
})

describe('record', () => {
  it('moves the balance by the signed amount', () => {
    const { snapshot, groceries } = seeded()
    const income = record(snapshot, { amount: 10000, kind: 'income', date: '2026-09-10', envelopeID: groceries.id }, clock)
    let next = apply(snapshot, income.changes)
    expect(next.envelopes[groceries.id]!.balanceMinorUnits).toBe(10000)

    const expense = record(next, { amount: 2550, kind: 'expense', date: '2026-09-10', envelopeID: groceries.id }, clock)
    next = apply(next, expense.changes)
    expect(next.envelopes[groceries.id]!.balanceMinorUnits).toBe(7450)
    expect(expense.transaction.amountMinorUnits).toBe(2550)
  })

  it('stores the amount as a magnitude even when given a negative', () => {
    const { snapshot, groceries } = seeded()
    const r = record(snapshot, { amount: -500, kind: 'expense', date: '2026-09-10', envelopeID: groceries.id }, clock)
    expect(r.transaction.amountMinorUnits).toBe(500)
    expect(apply(snapshot, r.changes).envelopes[groceries.id]!.balanceMinorUnits).toBe(-500)
  })

  it('paying a fixed bill sets lastPaidOn and advances the due date', () => {
    const { snapshot, rent } = seeded()
    const r = record(snapshot, { amount: 120000, kind: 'expense', date: '2026-09-20', envelopeID: rent.id }, clock)
    const next = apply(snapshot, r.changes)
    expect(next.envelopes[rent.id]!.lastPaidOn).toBe('2026-09-20')
    expect(next.envelopes[rent.id]!.billDueDate).toBe('2026-10-25')
  })

  it('sets nextOccurrence for a recurring expense', () => {
    const { snapshot, groceries } = seeded()
    const r = record(
      snapshot,
      { amount: 1000, kind: 'expense', date: '2026-09-10', envelopeID: groceries.id, recurrence: 'weekly' },
      clock,
    )
    expect(r.transaction.recurrence).toBe('weekly')
    expect(r.transaction.nextOccurrence).toBe('2026-09-17')
  })
})

describe('deleteTransaction', () => {
  it('reverses the balance', () => {
    const { snapshot, groceries } = seeded()
    const r = record(snapshot, { amount: 4000, kind: 'expense', date: '2026-09-10', envelopeID: groceries.id }, clock)
    let next = apply(snapshot, r.changes)
    next = apply(next, deleteTransaction(next, r.transaction.id))
    expect(next.envelopes[groceries.id]!.balanceMinorUnits).toBe(0)
    expect(Object.keys(next.transactions)).toHaveLength(0)
  })

  it('deleting one half of a transfer removes both and restores both balances', () => {
    const { snapshot, groceries, rent } = seeded()
    let next = apply(snapshot, transfer(snapshot, 3000, groceries.id, rent.id, '2026-09-10', clock))
    expect(next.envelopes[groceries.id]!.balanceMinorUnits).toBe(-3000)
    expect(next.envelopes[rent.id]!.balanceMinorUnits).toBe(3000)
    const halves = Object.values(next.transactions)
    expect(halves).toHaveLength(2)
    expect(halves[0]!.note).toBe('Groceries → Rent')

    next = apply(next, deleteTransaction(next, halves[0]!.id))
    expect(Object.keys(next.transactions)).toHaveLength(0)
    expect(next.envelopes[groceries.id]!.balanceMinorUnits).toBe(0)
    expect(next.envelopes[rent.id]!.balanceMinorUnits).toBe(0)
  })
})

describe('updateTransaction', () => {
  it('backs the old movement out and applies the new one across envelopes', () => {
    const { snapshot, groceries, rent } = seeded()
    const r = record(snapshot, { amount: 4000, kind: 'expense', date: '2026-09-10', envelopeID: groceries.id }, clock)
    let next = apply(snapshot, r.changes)
    next = apply(
      next,
      updateTransaction(next, r.transaction.id, {
        amount: 1000,
        kind: 'income',
        note: 'refund',
        date: '2026-09-11',
        envelopeID: rent.id,
        recurrence: 'none',
      }),
    )
    expect(next.envelopes[groceries.id]!.balanceMinorUnits).toBe(0)
    expect(next.envelopes[rent.id]!.balanceMinorUnits).toBe(1000)
    const updated = next.transactions[r.transaction.id]!
    expect(updated.note).toBe('refund')
    expect(updated.envelopeID).toBe(rent.id)
  })
})

describe('transfer', () => {
  it('ignores non-positive amounts and same-envelope transfers', () => {
    const { snapshot, groceries, rent } = seeded()
    expect(transfer(snapshot, 0, groceries.id, rent.id, '2026-09-10', clock)).toEqual({})
    expect(transfer(snapshot, 100, groceries.id, groceries.id, '2026-09-10', clock)).toEqual({})
  })
})

describe('merge', () => {
  it('moves the balance and re-points history, then deletes the source', () => {
    const { snapshot, groceries, rent } = seeded()
    const r = record(snapshot, { amount: 4000, kind: 'income', date: '2026-09-10', envelopeID: groceries.id }, clock)
    let next = apply(snapshot, r.changes)
    next = apply(next, merge(next, groceries.id, rent.id))
    expect(next.envelopes[groceries.id]).toBeUndefined()
    expect(next.envelopes[rent.id]!.balanceMinorUnits).toBe(4000)
    expect(next.transactions[r.transaction.id]!.envelopeID).toBe(rent.id)
  })
})

describe('deleteEnvelope', () => {
  it('cascades transactions and allocations', () => {
    const { snapshot, groceries } = seeded()
    const r = record(snapshot, { amount: 4000, kind: 'income', date: '2026-09-10', envelopeID: groceries.id }, clock)
    let next = apply(snapshot, r.changes)
    next = apply(next, deleteEnvelope(next, groceries.id))
    expect(next.envelopes[groceries.id]).toBeUndefined()
    expect(Object.keys(next.transactions)).toHaveLength(0)
  })
})

describe('changeKind', () => {
  it('clears fields that no longer apply', () => {
    const { snapshot, rent } = seeded()
    const next = apply(snapshot, changeKind(snapshot, rent.id, 'variable'))
    const envelope = next.envelopes[rent.id]!
    expect(envelope.kind).toBe('variable')
    expect(envelope.billAmountMinorUnits).toBeNull()
    expect(envelope.billDueDate).toBeNull()
    expect(envelope.billRecurrence).toBeNull()
  })
})

describe('reorder / retire', () => {
  it('writes sort indexes and retired flags', () => {
    const { snapshot, groceries } = seeded()
    const gas = createEnvelope(snapshot, '⛽️', 'Gas', 'variable', clock)
    let next = apply(snapshot, gas.changes)
    next = apply(next, reorder(next, [gas.envelope.id, groceries.id]))
    expect(sortedEnvelopes(next).map((e) => e.name)).toEqual(['Gas', 'Groceries', 'Rent', 'Trip'])
    next = apply(next, setRetired(next, groceries.id, true))
    expect(sortedEnvelopes(next).map((e) => e.name)).toEqual(['Gas', 'Rent', 'Trip'])
    expect(sortedEnvelopes(next, true)).toHaveLength(4)
  })
})

describe('createBudget', () => {
  it('closes the old cycle, records stuffing rows only for non-zero amounts, and moves balances', () => {
    const { snapshot, groceries, rent, trip } = seeded()
    const first = createBudget(
      snapshot,
      150000,
      'biweekly',
      '2026-09-10',
      '2026-09-24',
      [
        { envelopeID: groceries.id, amount: 30000, suggested: 0 },
        { envelopeID: rent.id, amount: 120000, suggested: 120000 },
        { envelopeID: trip.id, amount: 0, suggested: 0 },
      ],
      clock,
    )
    let next = apply(snapshot, first.changes)
    expect(activeCycle(next)?.id).toBe(first.cycle.id)
    expect(next.envelopes[groceries.id]!.balanceMinorUnits).toBe(30000)
    expect(next.envelopes[rent.id]!.balanceMinorUnits).toBe(120000)
    expect(Object.keys(next.allocations)).toHaveLength(3)
    const stuffings = transactionsNewestFirst(next)
    expect(stuffings).toHaveLength(2)
    expect(stuffings.every((t) => t.note === 'Budget stuffing' && t.kind === 'stuffing')).toBe(true)
    expect(next.settings.noSpendTrackingStart).toBe('2026-09-10')

    const second = createBudget(
      next,
      150000,
      'biweekly',
      '2026-09-24',
      '2026-10-08',
      [{ envelopeID: groceries.id, amount: -5000, suggested: 0 }],
      clock,
    )
    next = apply(next, second.changes)
    expect(next.cycles[first.cycle.id]!.isActive).toBe(false)
    expect(next.cycles[first.cycle.id]!.closedAt).toBe('2026-09-24')
    expect(activeCycle(next)?.id).toBe(second.cycle.id)
    expect(next.envelopes[groceries.id]!.balanceMinorUnits).toBe(25000)
    expect(transactionsNewestFirst(next)[0]!.kind).toBe('unstuffing')
    // Tracking start is set once and kept.
    expect(next.settings.noSpendTrackingStart).toBe('2026-09-10')
  })
})

describe('completeOnboarding', () => {
  it('creates starters, stores cash and frequency, and skips duplicates on replay', () => {
    const starters = [
      { emoji: '🛒', name: 'Groceries', kind: 'variable' as const },
      { emoji: '🏠', name: 'Rent', kind: 'fixed' as const },
    ]
    let next = apply(emptySnapshot(), completeOnboarding(emptySnapshot(), starters, 'monthly', 250000, clock))
    expect(sortedEnvelopes(next)).toHaveLength(2)
    expect(next.settings.hasOnboarded).toBe(true)
    expect(next.settings.preferredFrequency).toBe('monthly')
    expect(next.settings.startingCashMinorUnits).toBe(250000)
    expect(next.settings.noSpendTrackingStart).toBe('2026-09-10')
    // Every envelope starts empty.
    expect(sortedEnvelopes(next).every((e) => e.balanceMinorUnits === 0)).toBe(true)

    next = apply(next, completeOnboarding(next, starters, 'weekly', 100, clock))
    expect(sortedEnvelopes(next)).toHaveLength(2)
  })
})

describe('startFresh', () => {
  it('drops history and balances but keeps envelopes, and restarts tracking today', () => {
    const { snapshot, groceries, rent } = seeded()
    let next = apply(snapshot, record(snapshot, { amount: 4000, kind: 'income', date: '2026-09-01', envelopeID: groceries.id }, clock).changes)
    next = apply(next, record(next, { amount: 120000, kind: 'expense', date: '2026-09-02', envelopeID: rent.id }, clock).changes)
    next = apply(next, startFresh(next, { today: '2026-09-16', now: clock.now }))
    expect(Object.keys(next.transactions)).toHaveLength(0)
    expect(Object.keys(next.cycles)).toHaveLength(0)
    expect(sortedEnvelopes(next)).toHaveLength(3)
    expect(next.envelopes[groceries.id]!.balanceMinorUnits).toBe(0)
    expect(next.envelopes[rent.id]!.lastPaidOn).toBeNull()
    expect(next.settings.noSpendTrackingStart).toBe('2026-09-16')
  })
})
