import { addDays, daysBetween, type DayKey } from '../../domain/dates'
import { kindOrderIndex, type EnvelopeKind } from '../../domain/envelopeKind'
import { clampedToZero, toMajor, total, type Money } from '../../domain/money'
import type { SpendEvent } from '../../domain/noSpendEvaluator'
import { TRAILING_WINDOW_DAYS, type EnvelopeSnapshot } from '../../domain/suggestionEngine'
import { countsAsSpending, signedAmount, transactionKindTitle } from '../../domain/transactionKind'
import type {
  AllocationRecord,
  BudgetCycleRecord,
  EnvelopeRecord,
  Id,
  Snapshot,
  TransactionRecord,
} from '../types'

/**
 * Read-side helpers over a snapshot: the computed properties the Swift models
 * exposed (`stuffed`, `remainingFraction`, `isBillOutstanding`…) plus the
 * store's fetch methods (`envelopes()`, `activeCycle()`, `transactions()`).
 * All pure; views memoise on the snapshot.
 */

// MARK: - Envelopes

/** Envelopes in home-screen order: by type, then the user's own arrangement. */
export function sortedEnvelopes(snapshot: Snapshot, includeRetired = false): EnvelopeRecord[] {
  return Object.values(snapshot.envelopes)
    .filter((envelope) => includeRetired || !envelope.isRetired)
    .sort(compareEnvelopes)
}

export function envelopesOfKind(
  snapshot: Snapshot,
  kind: EnvelopeKind,
  includeRetired = false,
): EnvelopeRecord[] {
  return sortedEnvelopes(snapshot, includeRetired).filter((envelope) => envelope.kind === kind)
}

export function compareEnvelopes(lhs: EnvelopeRecord, rhs: EnvelopeRecord): number {
  const rank = kindOrderIndex(lhs.kind) - kindOrderIndex(rhs.kind)
  if (rank !== 0) return rank
  if (lhs.sortIndex !== rhs.sortIndex) return lhs.sortIndex - rhs.sortIndex
  return lhs.createdAt - rhs.createdAt
}

export function envelopeTransactions(snapshot: Snapshot, envelopeID: Id): TransactionRecord[] {
  return Object.values(snapshot.transactions).filter((t) => t.envelopeID === envelopeID)
}

export function envelopeAllocations(snapshot: Snapshot, envelopeID: Id): AllocationRecord[] {
  return Object.values(snapshot.allocations).filter((a) => a.envelopeID === envelopeID)
}

/** How much has been stuffed into this envelope in the given cycle. */
export function stuffed(
  snapshot: Snapshot,
  envelopeID: Id,
  cycle: BudgetCycleRecord | null,
): Money {
  if (!cycle) return 0
  return total(
    envelopeAllocations(snapshot, envelopeID)
      .filter((a) => a.cycleID === cycle.id)
      .map((a) => a.amountMinorUnits),
  )
}

/** Spending against this envelope from `since` through `now` inclusive. */
export function spentSince(snapshot: Snapshot, envelopeID: Id, since: DayKey, now: DayKey): Money {
  return total(
    envelopeTransactions(snapshot, envelopeID)
      .filter((t) => t.kind === 'expense' && t.date >= since && t.date <= now)
      .map((t) => t.amountMinorUnits),
  )
}

/**
 * 0…1 for the row's progress bar: how much of what was stuffed is still here,
 * so a full bar is a full envelope and it drains as you spend.
 */
export function remainingFraction(
  snapshot: Snapshot,
  envelope: EnvelopeRecord,
  cycle: BudgetCycleRecord | null,
): number {
  const stuffedAmount = stuffed(snapshot, envelope.id, cycle)
  if (stuffedAmount <= 0) return envelope.balanceMinorUnits > 0 ? 1 : 0
  return Math.min(1, clampedToZero(envelope.balanceMinorUnits) / stuffedAmount)
}

/** Progress toward a savings goal, or null for other envelope types. */
export function goalProgress(envelope: EnvelopeRecord): number | null {
  if (envelope.kind !== 'savings') return null
  const goal = envelope.goalAmountMinorUnits
  if (goal === null || goal <= 0) return null
  return Math.min(1, toMajor(envelope.balanceMinorUnits) / toMajor(goal))
}

/** True when a fixed bill is due and has not been paid this cycle. */
export function isBillOutstanding(envelope: EnvelopeRecord, today: DayKey): boolean {
  if (envelope.kind !== 'fixed' || envelope.billDueDate === null) return false
  const due = envelope.billDueDate
  if (envelope.lastPaidOn === null) return due <= today
  return envelope.lastPaidOn < due && due <= today
}

/** The snapshot the suggestion engine works from. */
export function suggestionSnapshot(
  snapshot: Snapshot,
  envelope: EnvelopeRecord,
  asOf: DayKey,
): EnvelopeSnapshot {
  const windowStart = addDays(asOf, -TRAILING_WINDOW_DAYS)
  return {
    id: envelope.id,
    kind: envelope.kind,
    currentBalance: envelope.balanceMinorUnits,
    billAmount: envelope.billAmountMinorUnits,
    billDueDate: envelope.billDueDate,
    goalAmount: envelope.goalAmountMinorUnits,
    goalDeadline: envelope.goalDeadline,
    trailingSpend: spentSince(snapshot, envelope.id, windowStart, asOf),
    trailingWindowDays: TRAILING_WINDOW_DAYS,
  }
}

// MARK: - Cycles

/** The budget currently being spent from, or null before the first budget. */
export function activeCycle(snapshot: Snapshot): BudgetCycleRecord | null {
  const active = Object.values(snapshot.cycles)
    .filter((cycle) => cycle.isActive)
    .sort((lhs, rhs) => (lhs.startDate < rhs.startDate ? 1 : lhs.startDate > rhs.startDate ? -1 : 0))
  return active[0] ?? null
}

/** All cycles, newest first. */
export function allCycles(snapshot: Snapshot): BudgetCycleRecord[] {
  return Object.values(snapshot.cycles).sort((lhs, rhs) =>
    lhs.startDate < rhs.startDate ? 1 : lhs.startDate > rhs.startDate ? -1 : 0,
  )
}

/** True once the next budget date has arrived. */
export function isBudgetDue(cycle: BudgetCycleRecord, today: DayKey): boolean {
  return today >= cycle.nextBudgetDate
}

/** Days until the next budget; negative once it is overdue. */
export function daysUntilNextBudget(cycle: BudgetCycleRecord, today: DayKey): number {
  return daysBetween(today, cycle.nextBudgetDate)
}

export function cycleAllocations(snapshot: Snapshot, cycleID: Id): AllocationRecord[] {
  return Object.values(snapshot.allocations).filter((a) => a.cycleID === cycleID)
}

// MARK: - Transactions

function compareNewestFirst(lhs: TransactionRecord, rhs: TransactionRecord): number {
  if (lhs.date !== rhs.date) return lhs.date < rhs.date ? 1 : -1
  return rhs.createdAt - lhs.createdAt
}

/** Newest first, optionally limited to an inclusive day range. */
export function transactionsNewestFirst(
  snapshot: Snapshot,
  from: DayKey | null = null,
  to: DayKey | null = null,
): TransactionRecord[] {
  return Object.values(snapshot.transactions)
    .filter((t) => (from === null || t.date >= from) && (to === null || t.date <= to))
    .sort(compareNewestFirst)
}

export function transactionsInTransferGroup(snapshot: Snapshot, groupID: Id): TransactionRecord[] {
  return Object.values(snapshot.transactions).filter((t) => t.transferGroupID === groupID)
}

export function transactionSignedAmount(transaction: TransactionRecord): Money {
  return signedAmount(transaction.kind, transaction.amountMinorUnits)
}

export function isRecurring(transaction: TransactionRecord): boolean {
  return transaction.recurrence !== null
}

/** What the row shows when the user left the description blank. */
export function transactionDisplayTitle(snapshot: Snapshot, transaction: TransactionRecord): string {
  if (transaction.note !== '') return transaction.note
  const envelope = snapshot.envelopes[transaction.envelopeID]
  if (envelope) return envelope.name
  return transactionKindTitle(transaction.kind)
}

/** The spend-free calendar's view of every row. */
export function spendEvents(snapshot: Snapshot): SpendEvent[] {
  return Object.values(snapshot.transactions)
    .filter((t) => snapshot.envelopes[t.envelopeID] !== undefined)
    .map((t) => ({ date: t.date, envelopeID: t.envelopeID, isExpense: countsAsSpending(t.kind) }))
}

export function offLimitsEnvelopeIDs(snapshot: Snapshot): Set<Id> {
  return new Set(
    Object.values(snapshot.envelopes)
      .filter((e) => e.isOffLimitsForNoSpend)
      .map((e) => e.id),
  )
}

/** Total balance across every non-retired envelope. */
export function totalOnHand(snapshot: Snapshot): Money {
  return total(sortedEnvelopes(snapshot).map((e) => e.balanceMinorUnits))
}
