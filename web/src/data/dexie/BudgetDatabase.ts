import Dexie, { type EntityTable } from 'dexie'
import type {
  AllocationRecord,
  BudgetCycleRecord,
  EnvelopeRecord,
  SettingsRecord,
  TransactionRecord,
} from '../types'

export const DATABASE_NAME = 'budget-bestie'

/**
 * The IndexedDB schema. Only the primary key and a few lookup indexes are
 * declared; Dexie stores every other field as-is. v1 loads everything into
 * memory on launch — a personal budget is a few thousand rows at most — so
 * the indexes exist for future partial loads rather than today's queries.
 */
export class BudgetDatabase extends Dexie {
  envelopes!: EntityTable<EnvelopeRecord, 'id'>
  transactions!: EntityTable<TransactionRecord, 'id'>
  allocations!: EntityTable<AllocationRecord, 'id'>
  cycles!: EntityTable<BudgetCycleRecord, 'id'>
  settings!: EntityTable<SettingsRecord, 'id'>

  constructor(name = DATABASE_NAME) {
    super(name)
    this.version(1).stores({
      envelopes: 'id, kind',
      transactions: 'id, date, envelopeID, transferGroupID',
      allocations: 'id, envelopeID, cycleID',
      cycles: 'id, isActive',
      settings: 'id',
    })
  }
}
