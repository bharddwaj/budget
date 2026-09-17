import type { BudgetFrequency } from '../domain/budgetFrequency'
import type { DayKey } from '../domain/dates'
import type { EnvelopeKind } from '../domain/envelopeKind'
import type { Money } from '../domain/money'
import type { RecurrenceRule, ThemePreference, TransactionKind } from '../domain/transactionKind'

/**
 * Persisted record shapes.
 *
 * These are plain JSON so the same records can live in IndexedDB today and in
 * Firestore documents later: money as integer cents, enums as their raw
 * strings, day-level dates as 'YYYY-MM-DD' keys, instants as epoch
 * milliseconds, and `null` rather than `undefined` for absent values
 * (Firestore rejects `undefined`).
 */
export type Id = string
export type Millis = number

/** The recurrence rules a bill can carry — never 'none'. */
export type BillRecurrence = Exclude<RecurrenceRule, 'none'>

export interface EnvelopeRecord {
  id: Id
  emoji: string
  name: string
  kind: EnvelopeKind
  /** Position within its type group on the home screen. */
  sortIndex: number
  balanceMinorUnits: Money
  /** Retired envelopes stay in history but drop out of stuffing and pickers. */
  isRetired: boolean
  /** When true, spending here breaks a spend-free day. */
  isOffLimitsForNoSpend: boolean
  createdAt: Millis
  // Fixed envelope details
  billAmountMinorUnits: Money | null
  billDueDate: DayKey | null
  billRecurrence: BillRecurrence | null
  /** Set when the bill is paid, so the unpaid-bill reminder stops nagging. */
  lastPaidOn: DayKey | null
  // Savings envelope details
  goalAmountMinorUnits: Money | null
  goalDeadline: DayKey | null
}

export interface TransactionRecord {
  id: Id
  /** Always positive; direction comes from `kind`. */
  amountMinorUnits: Money
  kind: TransactionKind
  note: string
  date: DayKey
  createdAt: Millis
  envelopeID: Id
  /** Links the two halves of a transfer so they can be shown and undone as one. */
  transferGroupID: Id | null
  /** Set on the template row of a recurring expense. */
  recurrence: BillRecurrence | null
  /** The next date this recurring expense is due to be recorded. */
  nextOccurrence: DayKey | null
}

export interface AllocationRecord {
  id: Id
  amountMinorUnits: Money
  suggestedMinorUnits: Money
  createdAt: Millis
  envelopeID: Id
  cycleID: Id
}

export interface BudgetCycleRecord {
  id: Id
  /** The day this budget was created — its "budget day". */
  startDate: DayKey
  nextBudgetDate: DayKey
  frequency: BudgetFrequency
  /** Total cash on hand when this budget was run, after reconciling. */
  startingBalanceMinorUnits: Money
  isActive: boolean
  closedAt: DayKey | null
}

export const SETTINGS_ID = 'app'

export interface SettingsRecord {
  id: typeof SETTINGS_ID
  hasOnboarded: boolean
  preferredFrequency: BudgetFrequency
  /** Cash entered during onboarding, waiting to be stuffed by the first budget. */
  startingCashMinorUnits: Money
  theme: ThemePreference
  currencySymbol: string
  currencySymbolIsLeading: boolean
  currencyDecimals: number
  currencyGroupingSeparator: string
  currencyDecimalSeparator: string
  /** A PIN gate stands in for the iOS app's Face ID lock. */
  lockEnabled: boolean
  pinHash: string | null
  pinSalt: string | null
  dailyReminderEnabled: boolean
  dailyReminderHour: number
  dailyReminderMinute: number
  budgetReminderEnabled: boolean
  transactionReminderEnabled: boolean
  billReminderEnabled: boolean
  billReminderLeadDays: number
  /** The first day the spend-free calendar applies; earlier days are blank. */
  noSpendTrackingStart: DayKey | null
}

/** Everything in the store, held in memory and handed to the UI as one value. */
export interface Snapshot {
  settings: SettingsRecord
  envelopes: Record<Id, EnvelopeRecord>
  transactions: Record<Id, TransactionRecord>
  allocations: Record<Id, AllocationRecord>
  cycles: Record<Id, BudgetCycleRecord>
}
