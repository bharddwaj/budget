import { useMemo, useState } from 'react'
import { useCurrencyFormat, useSnapshot, useStore } from '../../app/AppEnvironment'
import { goalProgress, sortedEnvelopes, transactionsNewestFirst } from '../../data/store/derive'
import type { EnvelopeRecord } from '../../data/types'
import { formatMoney } from '../../domain/currencyFormat'
import { addDays, daysBetween } from '../../domain/dates'
import { ENVELOPE_KIND_ORDER, kindTitle } from '../../domain/envelopeKind'
import { magnitude, total } from '../../domain/money'
import { kindColor } from '../../design/kinds'
import { AmountText } from '../../design/components/AmountText'
import { CardSurface } from '../../design/components/CardSurface'
import { DonutChart, DonutLegend, type DonutSlice } from '../../design/components/DonutChart'
import { SectionHeader } from '../../design/components/EmojiBadge'
import { NavBar } from '../../design/components/NavBar'
import { ChipButton } from '../../design/components/PillButton'
import { ProgressTrack } from '../../design/components/ProgressTrack'
import { DATE_RANGE_FILTERS, dateRangeStart, dateRangeTitle, type DateRangeFilter } from '../transactions/dateRangeFilter'
import '../transactions/transactions.css'
import './insights.css'

/** The recap tab: where the money went, how this stretch compares, and how the goals are coming along. */
export function InsightsView() {
  const store = useStore()
  const snapshot = useSnapshot()
  const format = useCurrencyFormat()
  const [range, setRange] = useState<DateRangeFilter>('thisMonth')
  const today = store.clock().today
  const windowStart = dateRangeStart(range, today)

  const inWindow = useMemo(() => transactionsNewestFirst(snapshot, windowStart), [snapshot, windowStart])
  const expenses = inWindow.filter((t) => t.kind === 'expense')
  const totalSpent = total(expenses.map((t) => t.amountMinorUnits))
  const totalEarned = total(inWindow.filter((t) => t.kind === 'income').map((t) => t.amountMinorUnits))

  /** Spending per envelope, biggest first. */
  const byEnvelope = useMemo(() => {
    const sums = new Map<string, number>()
    for (const t of expenses) sums.set(t.envelopeID, (sums.get(t.envelopeID) ?? 0) + t.amountMinorUnits)
    return [...sums.entries()]
      .map(([id, amount]) => ({ envelope: snapshot.envelopes[id], amount }))
      .filter((entry): entry is { envelope: EnvelopeRecord; amount: number } => entry.envelope !== undefined && entry.amount > 0)
      .sort((a, b) => b.amount - a.amount)
  }, [expenses, snapshot.envelopes])

  const byKind: DonutSlice[] = ENVELOPE_KIND_ORDER.map((kind) => ({
    id: kind,
    label: kindTitle(kind),
    amount: total(expenses.filter((t) => snapshot.envelopes[t.envelopeID]?.kind === kind).map((t) => t.amountMinorUnits)),
    color: kindColor(kind),
  }))

  /** The same length of time immediately before the window, for comparison. */
  const previousPeriodSpend = useMemo(() => {
    if (windowStart === null) return 0
    const length = daysBetween(windowStart, today)
    if (length <= 0) return 0
    const previousStart = addDays(windowStart, -length)
    return total(
      transactionsNewestFirst(snapshot, previousStart, addDays(windowStart, -1))
        .filter((t) => t.kind === 'expense')
        .map((t) => t.amountMinorUnits),
    )
  }, [snapshot, windowStart, today])

  let comparison: string | null = null
  if (previousPeriodSpend > 0) {
    const difference = totalSpent - previousPeriodSpend
    if (difference === 0) comparison = 'Exactly the same as the period before.'
    else comparison = `${formatMoney(format, magnitude(difference))} ${difference < 0 ? 'less' : 'more'} than the period before.`
  }

  const savings = sortedEnvelopes(snapshot).filter((e) => e.kind === 'savings')
  const topEnvelopes = byEnvelope.slice(0, 8)
  const largest = topEnvelopes[0]?.amount ?? 1

  return (
    <div className="screen">
      <NavBar title="Your recap" />
      <div className="screen__body">
        <div className="screen__content">
          <div className="chips">
            {DATE_RANGE_FILTERS.map((candidate) => (
              <ChipButton key={candidate} title={dateRangeTitle(candidate)} isSelected={range === candidate} onClick={() => setRange(candidate)} />
            ))}
          </div>

          <CardSurface padding={22}>
            <div className="headline">
              <div className="vstack" style={{ gap: 2, alignItems: 'center' }}>
                <span className="headline__label">you spent</span>
                <AmountText amount={totalSpent} font="t-hero" />
              </div>
              {comparison ? <span className="t-caption c-secondary">{comparison}</span> : null}
              <div className="divider" style={{ width: '100%' }} />
              <div className="headline__row">
                <span className="t-callout c-secondary">you made</span>
                <AmountText amount={totalEarned} font="t-headline" color="var(--color-positive)" />
              </div>
              <div className="headline__row">
                <span className="t-callout c-secondary">net</span>
                <AmountText amount={totalEarned - totalSpent} font="t-headline" showsSign colorBySign />
              </div>
            </div>
          </CardSurface>

          {expenses.length === 0 ? (
            <CardSurface>
              <div className="empty" style={{ gap: 'var(--space-small)' }}>
                <span className="emoji" style={{ fontSize: 44 }}>📊</span>
                <span className="t-headline c-primary">Nothing to recap yet</span>
                <span className="t-caption c-secondary">Record a few transactions and this fills itself in.</span>
              </div>
            </CardSurface>
          ) : (
            <>
              <CardSurface padding={22}>
                <div className="vstack" style={{ gap: 'var(--space-large)', alignItems: 'center' }}>
                  <SectionHeader title="By envelope type" />
                  <DonutChart slices={byKind} centerTitle="spent" centerAmount={totalSpent} diameter={170} />
                  <DonutLegend slices={byKind} />
                </div>
              </CardSurface>

              <CardSurface>
                <div className="vstack" style={{ gap: 'var(--space-medium)' }}>
                  <SectionHeader title="Where it went" />
                  <div className="bars">
                    {topEnvelopes.map(({ envelope, amount }) => (
                      <div key={envelope.id} className="bar">
                        <span className="bar__label">
                          <span className="emoji">{envelope.emoji}</span> {envelope.name}
                        </span>
                        <div className="bar__track">
                          <div className="bar__fill" style={{ width: `${(amount / largest) * 100}%`, background: kindColor(envelope.kind) }} />
                        </div>
                        <AmountText amount={amount} font="t-caption" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardSurface>
            </>
          )}

          {savings.length > 0 ? (
            <CardSurface>
              <div className="vstack" style={{ gap: 'var(--space-medium)' }}>
                <SectionHeader title="Your goals" />
                {savings.map((envelope) => (
                  <div key={envelope.id} className="goal">
                    <div className="goal__row">
                      <span className="t-body c-primary">
                        <span className="emoji">{envelope.emoji}</span> {envelope.name}
                      </span>
                      <span className="t-caption c-secondary">
                        {formatMoney(format, envelope.balanceMinorUnits)} / {formatMoney(format, envelope.goalAmountMinorUnits ?? 0)}
                      </span>
                    </div>
                    <ProgressTrack progress={goalProgress(envelope) ?? 0} tint="var(--color-savings)" />
                  </div>
                ))}
              </div>
            </CardSurface>
          ) : null}
        </div>
      </div>
    </div>
  )
}
