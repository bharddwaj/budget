import { useMemo, useState } from 'react'
import { useCurrencyFormat, useSnapshot, useStore } from '../../app/AppEnvironment'
import { useAppRoute } from '../../app/AppRoute'
import { transactionSignedAmount, transactionsNewestFirst } from '../../data/store/derive'
import { deleteTransaction } from '../../data/store/ops'
import type { Id, TransactionRecord } from '../../data/types'
import { formatMoney } from '../../domain/currencyFormat'
import { formatDay, type DayKey } from '../../domain/dates'
import { total } from '../../domain/money'
import { AmountText } from '../../design/components/AmountText'
import { CardSurface } from '../../design/components/CardSurface'
import { SectionHeader } from '../../design/components/EmojiBadge'
import { InOutChart, type InOutPoint } from '../../design/components/InOutChart'
import { ConfirmDialog } from '../../design/components/Menu'
import { NavBar, NavIconButton } from '../../design/components/NavBar'
import { ChipButton } from '../../design/components/PillButton'
import { DATE_RANGE_FILTERS, dateRangeStart, dateRangeTitle, type DateRangeFilter } from './dateRangeFilter'
import { TransactionRow } from './TransactionRow'
import './transactions.css'

type LedgerFilter = 'all' | 'incomeOnly' | 'expensesOnly'

/** The money tab: what came in, what went out, and the full ledger underneath. */
export function TransactionsView() {
  const store = useStore()
  const snapshot = useSnapshot()
  const route = useAppRoute()
  const format = useCurrencyFormat()
  const [range, setRange] = useState<DateRangeFilter>('thisMonth')
  const [kindFilter, setKindFilter] = useState<LedgerFilter>('all')
  const [pendingActions, setPendingActions] = useState<Id | null>(null)
  const today = store.clock().today

  const windowed = useMemo(() => transactionsNewestFirst(snapshot, dateRangeStart(range, today)), [snapshot, range, today])
  const visible = windowed.filter((t) => (kindFilter === 'all' ? true : kindFilter === 'incomeOnly' ? t.kind === 'income' : t.kind === 'expense'))
  const moneyIn = total(windowed.filter((t) => t.kind === 'income').map((t) => t.amountMinorUnits))
  const moneyOut = total(windowed.filter((t) => t.kind === 'expense').map((t) => t.amountMinorUnits))

  const sections = useMemo(() => groupByDay(visible), [visible])
  const dailyTotals = useMemo<InOutPoint[]>(
    () =>
      groupByDay(windowed)
        .map(({ day, rows }) => ({
          day,
          incoming: total(rows.filter((t) => t.kind === 'income').map((t) => t.amountMinorUnits)),
          outgoing: total(rows.filter((t) => t.kind === 'expense').map((t) => t.amountMinorUnits)),
        }))
        .sort((lhs, rhs) => (lhs.day < rhs.day ? -1 : 1)),
    [windowed],
  )

  const toggle = (filter: LedgerFilter) => setKindFilter((current) => (current === filter ? 'all' : filter))

  return (
    <div className="screen">
      <NavBar title="Your money" trailing={<NavIconButton icon="plus" label="Add a transaction" onClick={() => route.addTransaction()} />} />
      <div className="screen__body">
        <div className="screen__content">
          <div className="chips">
            {DATE_RANGE_FILTERS.map((candidate) => (
              <ChipButton key={candidate} title={dateRangeTitle(candidate)} isSelected={range === candidate} onClick={() => setRange(candidate)} />
            ))}
          </div>

          <CardSurface>
            <div className="vstack" style={{ gap: 'var(--space-medium)' }}>
              <div className="tiles">
                <button type="button" className={`tile tile--in ${kindFilter === 'incomeOnly' ? 'tile--selected' : ''}`} onClick={() => toggle('incomeOnly')}>
                  <span className="tile__title">money in</span>
                  <AmountText amount={moneyIn} font="t-headline" color="var(--color-positive)" />
                </button>
                <button type="button" className={`tile tile--out ${kindFilter === 'expensesOnly' ? 'tile--selected' : ''}`} onClick={() => toggle('expensesOnly')}>
                  <span className="tile__title">money out</span>
                  <AmountText amount={moneyOut} font="t-headline" color="var(--color-negative)" />
                </button>
              </div>
              <InOutChart points={dailyTotals} />
            </div>
          </CardSurface>

          {visible.length === 0 ? (
            <CardSurface>
              <div className="empty" style={{ gap: 'var(--space-small)' }}>
                <span className="emoji" style={{ fontSize: 44 }}>🧾</span>
                <span className="t-headline c-primary">Nothing here yet</span>
                <span className="t-caption c-secondary">Tap + to record what you spent.</span>
              </div>
            </CardSurface>
          ) : (
            sections.map(({ day, rows }) => (
              <div key={day} className="vstack" style={{ gap: 'var(--space-small)' }}>
                <SectionHeader title={formatDay(day, 'longWeekdayMonthDay')} trailing={formatMoney(format, total(rows.map(transactionSignedAmount)), true)} />
                <CardSurface>
                  {rows.map((transaction, index) => (
                    <div key={transaction.id}>
                      <TransactionRow
                        snapshot={snapshot}
                        transaction={transaction}
                        onClick={() => route.editTransaction(transaction.id)}
                        onLongPress={() => setPendingActions(transaction.id)}
                      />
                      {index < rows.length - 1 ? <div className="divider" /> : null}
                    </div>
                  ))}
                </CardSurface>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={pendingActions !== null}
        title="Transaction"
        onCancel={() => setPendingActions(null)}
        actions={[
          { title: 'Edit', onSelect: () => pendingActions && route.editTransaction(pendingActions) },
          {
            title: 'Delete',
            destructive: true,
            onSelect: () => pendingActions && store.commit(deleteTransaction(store.getSnapshot(), pendingActions)),
          },
        ]}
      />
    </div>
  )
}

/** Grouped by day so the list reads like a statement, newest day first. */
export function groupByDay(rows: TransactionRecord[]): { day: DayKey; rows: TransactionRecord[] }[] {
  const grouped = new Map<DayKey, TransactionRecord[]>()
  for (const row of rows) {
    const list = grouped.get(row.date) ?? []
    list.push(row)
    grouped.set(row.date, list)
  }
  return [...grouped.entries()]
    .map(([day, dayRows]) => ({ day, rows: dayRows.sort((lhs, rhs) => rhs.createdAt - lhs.createdAt) }))
    .sort((lhs, rhs) => (lhs.day < rhs.day ? 1 : -1))
}
