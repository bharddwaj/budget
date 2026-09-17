import { applyChangeSet } from '../../changeSet'
import { emptySnapshot } from '../../defaults'
import type { ChangeSet } from '../../repository'
import type { EnvelopeRecord, Snapshot } from '../../types'
import { createEnvelope, type Clock } from '../ops'

export const clock: Clock = { today: '2026-09-10', now: Date.UTC(2026, 8, 10, 12) }

export function apply(snapshot: Snapshot, changes: ChangeSet): Snapshot {
  return applyChangeSet(snapshot, changes)
}

/** A snapshot with one variable, one fixed and one savings envelope. */
export function seeded(): {
  snapshot: Snapshot
  groceries: EnvelopeRecord
  rent: EnvelopeRecord
  trip: EnvelopeRecord
} {
  let snapshot = emptySnapshot()
  const g = createEnvelope(snapshot, '🛒', 'Groceries', 'variable', clock)
  snapshot = apply(snapshot, g.changes)
  const r = createEnvelope(snapshot, '🏠', 'Rent', 'fixed', clock, {
    billAmountMinorUnits: 120000,
    billDueDate: '2026-09-25',
    billRecurrence: 'monthly',
  })
  snapshot = apply(snapshot, r.changes)
  const t = createEnvelope(snapshot, '✈️', 'Trip', 'savings', clock, {
    goalAmountMinorUnits: 100000,
    goalDeadline: '2026-12-01',
  })
  snapshot = apply(snapshot, t.changes)
  return { snapshot, groceries: g.envelope, rent: r.envelope, trip: t.envelope }
}
