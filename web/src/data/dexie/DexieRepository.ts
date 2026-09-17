import { defaultSettings } from '../defaults'
import type { BudgetRepository, ChangeSet, CollectionChanges } from '../repository'
import { SETTINGS_ID, type Id, type Snapshot } from '../types'
import { BudgetDatabase } from './BudgetDatabase'

/** The on-device repository: IndexedDB through Dexie. */
export class DexieRepository implements BudgetRepository {
  private readonly db: BudgetDatabase

  constructor(db: BudgetDatabase = new BudgetDatabase()) {
    this.db = db
  }

  async load(): Promise<Snapshot> {
    const [envelopes, transactions, allocations, cycles, settings] = await Promise.all([
      this.db.envelopes.toArray(),
      this.db.transactions.toArray(),
      this.db.allocations.toArray(),
      this.db.cycles.toArray(),
      this.db.settings.get(SETTINGS_ID),
    ])

    let resolvedSettings = settings
    if (!resolvedSettings) {
      resolvedSettings = defaultSettings()
      await this.db.settings.put(resolvedSettings)
    } else {
      // Fields added after a user's first install come back undefined; fill
      // them from the defaults so the rest of the app never sees a hole.
      resolvedSettings = { ...defaultSettings(), ...resolvedSettings }
    }

    return {
      settings: resolvedSettings,
      envelopes: byId(envelopes),
      transactions: byId(transactions),
      allocations: byId(allocations),
      cycles: byId(cycles),
    }
  }

  async apply(changes: ChangeSet): Promise<void> {
    const { db } = this
    await db.transaction(
      'rw',
      [db.envelopes, db.transactions, db.allocations, db.cycles, db.settings],
      async () => {
        await applyCollection(db.envelopes, changes.envelopes)
        await applyCollection(db.transactions, changes.transactions)
        await applyCollection(db.allocations, changes.allocations)
        await applyCollection(db.cycles, changes.cycles)
        if (changes.settings) await db.settings.put(changes.settings)
      },
    )
  }

  subscribe(): () => void {
    return () => {}
  }

  async wipe(): Promise<void> {
    const { db } = this
    await db.transaction(
      'rw',
      [db.envelopes, db.transactions, db.allocations, db.cycles, db.settings],
      async () => {
        await Promise.all([
          db.envelopes.clear(),
          db.transactions.clear(),
          db.allocations.clear(),
          db.cycles.clear(),
          db.settings.clear(),
        ])
      },
    )
  }
}

interface Table<Record> {
  bulkPut(records: Record[]): Promise<unknown>
  bulkDelete(ids: Id[]): Promise<unknown>
}

async function applyCollection<Record>(
  table: Table<Record>,
  changes: CollectionChanges<Record> | undefined,
): Promise<void> {
  if (!changes) return
  if (changes.delete?.length) await table.bulkDelete(changes.delete)
  if (changes.put?.length) await table.bulkPut(changes.put)
}

function byId<Record extends { id: Id }>(records: Record[]): globalThis.Record<Id, Record> {
  const map: globalThis.Record<Id, Record> = {}
  for (const record of records) map[record.id] = record
  return map
}
