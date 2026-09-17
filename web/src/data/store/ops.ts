import type { BudgetFrequency } from '../../domain/budgetFrequency'
import type { DayKey } from '../../domain/dates'
import { isSpendFreeByDefault, type EnvelopeKind } from '../../domain/envelopeKind'
import type { Money } from '../../domain/money'
import {
  nextRecurrence,
  signedAmount,
  type RecurrenceRule,
  type TransactionKind,
} from '../../domain/transactionKind'
import { mergeChangeSets } from '../changeSet'
import type { ChangeSet } from '../repository'
import type {
  AllocationRecord,
  BillRecurrence,
  BudgetCycleRecord,
  EnvelopeRecord,
  Id,
  SettingsRecord,
  Snapshot,
  TransactionRecord,
} from '../types'
import {
  activeCycle,
  envelopeAllocations,
  envelopesOfKind,
  envelopeTransactions,
  transactionsInTransferGroup,
} from './derive'

/**
 * Every write the app makes, as a pure function `(snapshot, args) → ChangeSet`.
 *
 * Balances are derived state that must stay in step with the ledger, so no
 * screen ever edits `balanceMinorUnits` directly — it records a transaction and
 * lets these functions apply the movement. That single rule is what keeps the
 * home screen, the envelope detail and the recap from ever disagreeing.
 */

export interface Clock {
  today: DayKey
  now: Millis
}
type Millis = number

function newId(): Id {
  return crypto.randomUUID()
}

// MARK: - Settings

export function updateSettings(snapshot: Snapshot, patch: Partial<SettingsRecord>): ChangeSet {
  return { settings: { ...snapshot.settings, ...patch } }
}

// MARK: - Envelopes

export interface EnvelopeDetails {
  emoji: string
  name: string
  isOffLimitsForNoSpend: boolean
  billAmountMinorUnits?: Money | null
  billDueDate?: DayKey | null
  billRecurrence?: BillRecurrence | null
  goalAmountMinorUnits?: Money | null
  goalDeadline?: DayKey | null
}

export function createEnvelope(
  snapshot: Snapshot,
  emoji: string,
  name: string,
  kind: EnvelopeKind,
  clock: Clock,
  details: Partial<EnvelopeDetails> = {},
): { changes: ChangeSet; envelope: EnvelopeRecord } {
  const siblings = envelopesOfKind(snapshot, kind, true)
  const sortIndex = siblings.reduce((max, e) => Math.max(max, e.sortIndex), -1) + 1
  const envelope: EnvelopeRecord = {
    id: newId(),
    emoji,
    name,
    kind,
    sortIndex,
    balanceMinorUnits: 0,
    isRetired: false,
    isOffLimitsForNoSpend: details.isOffLimitsForNoSpend ?? !isSpendFreeByDefault(kind),
    createdAt: clock.now,
    billAmountMinorUnits: kind === 'fixed' ? (details.billAmountMinorUnits ?? null) : null,
    billDueDate: kind === 'fixed' ? (details.billDueDate ?? null) : null,
    billRecurrence: kind === 'fixed' ? (details.billRecurrence ?? null) : null,
    lastPaidOn: null,
    goalAmountMinorUnits: kind === 'savings' ? (details.goalAmountMinorUnits ?? null) : null,
    goalDeadline: kind === 'savings' ? (details.goalDeadline ?? null) : null,
  }
  return { changes: { envelopes: { put: [envelope] } }, envelope }
}

/** The editor's field writes (emoji, name, no-spend flag, kind-specific fields). */
export function updateEnvelope(
  snapshot: Snapshot,
  envelopeID: Id,
  details: Partial<EnvelopeDetails>,
): ChangeSet {
  const envelope = snapshot.envelopes[envelopeID]
  if (!envelope) return {}
  const updated: EnvelopeRecord = {
    ...envelope,
    emoji: details.emoji ?? envelope.emoji,
    name: details.name ?? envelope.name,
    isOffLimitsForNoSpend: details.isOffLimitsForNoSpend ?? envelope.isOffLimitsForNoSpend,
    billAmountMinorUnits:
      details.billAmountMinorUnits !== undefined ? details.billAmountMinorUnits : envelope.billAmountMinorUnits,
    billDueDate: details.billDueDate !== undefined ? details.billDueDate : envelope.billDueDate,
    billRecurrence: details.billRecurrence !== undefined ? details.billRecurrence : envelope.billRecurrence,
    goalAmountMinorUnits:
      details.goalAmountMinorUnits !== undefined ? details.goalAmountMinorUnits : envelope.goalAmountMinorUnits,
    goalDeadline: details.goalDeadline !== undefined ? details.goalDeadline : envelope.goalDeadline,
  }
  return { envelopes: { put: [updated] } }
}

/** Persists a drag-to-reorder within one type group. */
export function reorder(snapshot: Snapshot, orderedIDs: Id[]): ChangeSet {
  const put: EnvelopeRecord[] = []
  orderedIDs.forEach((id, index) => {
    const envelope = snapshot.envelopes[id]
    if (envelope && envelope.sortIndex !== index) put.push({ ...envelope, sortIndex: index })
  })
  return { envelopes: { put } }
}

/**
 * Retiring keeps the envelope's history but takes it out of stuffing and the
 * transaction picker.
 */
export function setRetired(snapshot: Snapshot, envelopeID: Id, isRetired: boolean): ChangeSet {
  const envelope = snapshot.envelopes[envelopeID]
  if (!envelope) return {}
  return { envelopes: { put: [{ ...envelope, isRetired }] } }
}

/**
 * Folds `source` into `destination`: its balance and its whole transaction and
 * allocation history move across, then the empty envelope is removed.
 */
export function merge(snapshot: Snapshot, sourceID: Id, destinationID: Id): ChangeSet {
  const source = snapshot.envelopes[sourceID]
  const destination = snapshot.envelopes[destinationID]
  if (!source || !destination || sourceID === destinationID) return {}

  const movedTransactions = envelopeTransactions(snapshot, sourceID).map((t) => ({
    ...t,
    envelopeID: destinationID,
  }))
  const movedAllocations = envelopeAllocations(snapshot, sourceID).map((a) => ({
    ...a,
    envelopeID: destinationID,
  }))

  return {
    envelopes: {
      put: [
        { ...destination, balanceMinorUnits: destination.balanceMinorUnits + source.balanceMinorUnits },
      ],
      delete: [sourceID],
    },
    transactions: { put: movedTransactions },
    allocations: { put: movedAllocations },
  }
}

/** Deletes an envelope and everything recorded against it. */
export function deleteEnvelope(snapshot: Snapshot, envelopeID: Id): ChangeSet {
  if (!snapshot.envelopes[envelopeID]) return {}
  return {
    envelopes: { delete: [envelopeID] },
    transactions: { delete: envelopeTransactions(snapshot, envelopeID).map((t) => t.id) },
    allocations: { delete: envelopeAllocations(snapshot, envelopeID).map((a) => a.id) },
  }
}

/**
 * Changing type keeps the balance and history, and clears the details that no
 * longer apply so a former bill does not keep a stale due date.
 */
export function changeKind(snapshot: Snapshot, envelopeID: Id, kind: EnvelopeKind): ChangeSet {
  const envelope = snapshot.envelopes[envelopeID]
  if (!envelope || envelope.kind === kind) return {}
  const updated: EnvelopeRecord = { ...envelope, kind }
  if (kind !== 'fixed') {
    updated.billAmountMinorUnits = null
    updated.billDueDate = null
    updated.billRecurrence = null
    updated.lastPaidOn = null
  }
  if (kind !== 'savings') {
    updated.goalAmountMinorUnits = null
    updated.goalDeadline = null
  }
  return { envelopes: { put: [updated] } }
}

// MARK: - Transactions

export interface RecordArgs {
  amount: Money
  kind: TransactionKind
  note?: string
  date: DayKey
  envelopeID: Id
  recurrence?: RecurrenceRule
  transferGroupID?: Id | null
}

/** Records a transaction and moves the envelope's balance to match. */
export function record(
  snapshot: Snapshot,
  args: RecordArgs,
  clock: Clock,
): { changes: ChangeSet; transaction: TransactionRecord } {
  const envelope = snapshot.envelopes[args.envelopeID]
  if (!envelope) throw new Error(`No envelope ${args.envelopeID}`)

  const recurrence = args.recurrence ?? 'none'
  const transaction: TransactionRecord = {
    id: newId(),
    amountMinorUnits: Math.abs(args.amount),
    kind: args.kind,
    note: args.note ?? '',
    date: args.date,
    createdAt: clock.now,
    envelopeID: envelope.id,
    transferGroupID: args.transferGroupID ?? null,
    recurrence: recurrence === 'none' ? null : recurrence,
    nextOccurrence: nextRecurrence(recurrence, args.date),
  }

  let updated: EnvelopeRecord = {
    ...envelope,
    balanceMinorUnits: envelope.balanceMinorUnits + signedAmount(args.kind, transaction.amountMinorUnits),
  }

  // Paying a fixed bill silences its reminder until the next due date.
  if (args.kind === 'expense' && envelope.kind === 'fixed') {
    updated = { ...updated, lastPaidOn: args.date }
    updated = advanceBillDueDateIfPaid(updated)
  }

  return {
    changes: { envelopes: { put: [updated] }, transactions: { put: [transaction] } },
    transaction,
  }
}

/** Rolls a paid bill forward to its next due date. */
function advanceBillDueDateIfPaid(envelope: EnvelopeRecord): EnvelopeRecord {
  if (envelope.billDueDate === null) return envelope
  const rule: RecurrenceRule = envelope.billRecurrence ?? 'monthly'
  const next = nextRecurrence(rule, envelope.billDueDate)
  if (next === null) return envelope
  return { ...envelope, billDueDate: next }
}

/**
 * Reverses a transaction's effect and removes it. Deleting one half of a
 * transfer removes the other half too, so the pair can never be orphaned.
 */
export function deleteTransaction(snapshot: Snapshot, transactionID: Id): ChangeSet {
  const transaction = snapshot.transactions[transactionID]
  if (!transaction) return {}

  const halves =
    transaction.transferGroupID !== null
      ? transactionsInTransferGroup(snapshot, transaction.transferGroupID)
      : [transaction]

  const balances = new Map<Id, EnvelopeRecord>()
  for (const half of halves) {
    const envelope = balances.get(half.envelopeID) ?? snapshot.envelopes[half.envelopeID]
    if (!envelope) continue
    balances.set(half.envelopeID, {
      ...envelope,
      balanceMinorUnits: envelope.balanceMinorUnits - signedAmount(half.kind, half.amountMinorUnits),
    })
  }

  return {
    envelopes: { put: [...balances.values()] },
    transactions: { delete: halves.map((half) => half.id) },
  }
}

export interface UpdateArgs {
  amount: Money
  kind: TransactionKind
  note: string
  date: DayKey
  envelopeID: Id
  recurrence: RecurrenceRule
}

/**
 * Applies an edit by backing the old movement out and the new one in, which
 * keeps balances correct across a change of amount, kind or envelope.
 */
export function updateTransaction(snapshot: Snapshot, transactionID: Id, args: UpdateArgs): ChangeSet {
  const transaction = snapshot.transactions[transactionID]
  const destination = snapshot.envelopes[args.envelopeID]
  if (!transaction || !destination) return {}

  const envelopes = new Map<Id, EnvelopeRecord>()
  const source = snapshot.envelopes[transaction.envelopeID]
  if (source) {
    envelopes.set(source.id, {
      ...source,
      balanceMinorUnits:
        source.balanceMinorUnits - signedAmount(transaction.kind, transaction.amountMinorUnits),
    })
  }

  const amount = Math.abs(args.amount)
  const target = envelopes.get(destination.id) ?? destination
  envelopes.set(destination.id, {
    ...target,
    balanceMinorUnits: target.balanceMinorUnits + signedAmount(args.kind, amount),
  })

  const updated: TransactionRecord = {
    ...transaction,
    amountMinorUnits: amount,
    kind: args.kind,
    note: args.note,
    date: args.date,
    envelopeID: destination.id,
    recurrence: args.recurrence === 'none' ? null : args.recurrence,
    nextOccurrence: nextRecurrence(args.recurrence, args.date),
  }

  return { envelopes: { put: [...envelopes.values()] }, transactions: { put: [updated] } }
}

/** Moves money between envelopes as a linked pair of rows. */
export function transfer(
  snapshot: Snapshot,
  amount: Money,
  sourceID: Id,
  destinationID: Id,
  date: DayKey,
  clock: Clock,
  note = '',
): ChangeSet {
  const source = snapshot.envelopes[sourceID]
  const destination = snapshot.envelopes[destinationID]
  if (!source || !destination || amount <= 0 || sourceID === destinationID) return {}

  const groupID = newId()
  const label = note === '' ? `${source.name} → ${destination.name}` : note

  const out = record(
    snapshot,
    { amount, kind: 'transferOut', note: label, date, envelopeID: sourceID, transferGroupID: groupID },
    clock,
  ).changes
  const into = record(
    snapshot,
    { amount, kind: 'transferIn', note: label, date, envelopeID: destinationID, transferGroupID: groupID },
    clock,
  ).changes
  return mergeChangeSets(out, into)
}

// MARK: - Budget creation

export interface AllocationEntry {
  envelopeID: Id
  amount: Money
  suggested: Money
}

/**
 * Closes the active cycle and opens a new one with the given stuffing.
 *
 * Each allocation is also written as a `stuffing` transaction so that an
 * envelope's detail screen reads as one continuous ledger of money in and
 * money out.
 */
export function createBudget(
  snapshot: Snapshot,
  startingBalance: Money,
  frequency: BudgetFrequency,
  startDate: DayKey,
  nextBudgetDate: DayKey,
  allocations: AllocationEntry[],
  clock: Clock,
): { changes: ChangeSet; cycle: BudgetCycleRecord } {
  const cyclePuts: BudgetCycleRecord[] = []
  const current = activeCycle(snapshot)
  if (current) cyclePuts.push({ ...current, isActive: false, closedAt: startDate })

  const cycle: BudgetCycleRecord = {
    id: newId(),
    startDate,
    nextBudgetDate,
    frequency,
    startingBalanceMinorUnits: startingBalance,
    isActive: true,
    closedAt: null,
  }
  cyclePuts.push(cycle)

  const allocationPuts: AllocationRecord[] = []
  const transactionPuts: TransactionRecord[] = []
  const envelopePuts: EnvelopeRecord[] = []

  for (const entry of allocations) {
    const envelope = snapshot.envelopes[entry.envelopeID]
    if (!envelope) continue

    allocationPuts.push({
      id: newId(),
      amountMinorUnits: entry.amount,
      suggestedMinorUnits: entry.suggested,
      createdAt: clock.now,
      envelopeID: envelope.id,
      cycleID: cycle.id,
    })

    if (entry.amount !== 0) {
      transactionPuts.push({
        id: newId(),
        amountMinorUnits: Math.abs(entry.amount),
        kind: entry.amount > 0 ? 'stuffing' : 'unstuffing',
        note: 'Budget stuffing',
        date: startDate,
        createdAt: clock.now,
        envelopeID: envelope.id,
        transferGroupID: null,
        recurrence: null,
        nextOccurrence: null,
      })
    }

    // The stuffing screen works from target balances, so an envelope's new
    // balance is exactly what was allocated to it plus what it carried in.
    envelopePuts.push({ ...envelope, balanceMinorUnits: envelope.balanceMinorUnits + entry.amount })
  }

  const settings: SettingsRecord = {
    ...snapshot.settings,
    noSpendTrackingStart: snapshot.settings.noSpendTrackingStart ?? startDate,
    // The cash entered during onboarding has now been placed.
    startingCashMinorUnits: 0,
  }

  return {
    changes: {
      cycles: { put: cyclePuts },
      allocations: { put: allocationPuts },
      transactions: { put: transactionPuts },
      envelopes: { put: envelopePuts },
      settings,
    },
    cycle,
  }
}

// MARK: - Onboarding and reset

export interface StarterEnvelope {
  emoji: string
  name: string
  kind: EnvelopeKind
}

/**
 * Creates the chosen starter envelopes and marks onboarding done. Envelopes
 * whose name already exists are skipped so "Replay the intro" cannot create
 * duplicates.
 */
export function completeOnboarding(
  snapshot: Snapshot,
  starters: StarterEnvelope[],
  frequency: BudgetFrequency,
  totalCash: Money,
  clock: Clock,
): ChangeSet {
  const existingNames = new Set(Object.values(snapshot.envelopes).map((e) => e.name.toLowerCase()))
  let working = snapshot
  let changes: ChangeSet = {}
  for (const starter of starters) {
    if (existingNames.has(starter.name.toLowerCase())) continue
    const created = createEnvelope(working, starter.emoji, starter.name, starter.kind, clock)
    changes = mergeChangeSets(changes, created.changes)
    working = {
      ...working,
      envelopes: { ...working.envelopes, [created.envelope.id]: created.envelope },
    }
  }

  return mergeChangeSets(changes, {
    settings: {
      ...snapshot.settings,
      hasOnboarded: true,
      preferredFrequency: frequency,
      // Every envelope starts empty; this is what the first budget stuffs.
      startingCashMinorUnits: totalCash,
      noSpendTrackingStart: clock.today,
    },
  })
}

/** Keeps the envelopes and their setup, drops the history and balances. */
export function startFresh(snapshot: Snapshot, clock: Clock): ChangeSet {
  return {
    transactions: { delete: Object.keys(snapshot.transactions) },
    allocations: { delete: Object.keys(snapshot.allocations) },
    cycles: { delete: Object.keys(snapshot.cycles) },
    envelopes: {
      put: Object.values(snapshot.envelopes).map((e) => ({
        ...e,
        balanceMinorUnits: 0,
        lastPaidOn: null,
      })),
    },
    // Tracking restarts today rather than being cleared: with no start day
    // every past day would read as spend-free and the streak would balloon.
    settings: { ...snapshot.settings, noSpendTrackingStart: clock.today, startingCashMinorUnits: 0 },
  }
}
