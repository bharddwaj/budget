import { useMemo, useState } from 'react'
import { useSnapshot, useStore } from '../../app/AppEnvironment'
import { useAppRoute } from '../../app/AppRoute'
import { activeCycle, isBudgetDue, offLimitsEnvelopeIDs, sortedEnvelopes, spendEvents } from '../../data/store/derive'
import { addDays, endOfMonth, formatDay, startOfMonth } from '../../domain/dates'
import { currentStreak, statuses } from '../../domain/noSpendEvaluator'
import { Icon } from '../../design/Icon'
import { kindColor } from '../../design/kinds'
import { AmountText } from '../../design/components/AmountText'
import { CardSurface } from '../../design/components/CardSurface'
import { EmojiBadge, SectionHeader } from '../../design/components/EmojiBadge'
import { MonthCalendarGrid, MonthNav } from '../../design/components/MonthCalendarGrid'
import { NavBar } from '../../design/components/NavBar'
import { ChipButton } from '../../design/components/PillButton'
import { Sheet } from '../../design/components/Sheet'
import { NoSpendSettingsSheet } from './NoSpendSettingsSheet'
import './calendar.css'

/** The overview tab: a month calendar coloured by spend-free days, your streak, and what's coming up. */
export function OverviewCalendarView() {
  const store = useStore()
  const snapshot = useSnapshot()
  const route = useAppRoute()
  const today = store.clock().today
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(today))
  const [isConfiguring, setConfiguring] = useState(false)

  const cycle = activeCycle(snapshot)
  const events = useMemo(() => spendEvents(snapshot), [snapshot])
  const offLimits = useMemo(() => offLimitsEnvelopeIDs(snapshot), [snapshot])
  const trackingStart = snapshot.settings.noSpendTrackingStart

  const monthStatuses = useMemo(
    () => statuses(visibleMonth, endOfMonth(visibleMonth), events, offLimits, trackingStart, today),
    [visibleMonth, events, offLimits, trackingStart, today],
  )
  // The streak is counted across all of history, not just the visible month.
  const streak = useMemo(
    () => currentStreak(statuses(addDays(today, -365), today, events, offLimits, trackingStart, today), today),
    [events, offLimits, trackingStart, today],
  )

  /** Bills falling on or after today, soonest first. */
  const upcoming = useMemo(
    () =>
      sortedEnvelopes(snapshot)
        .filter((e) => e.kind === 'fixed' && e.billDueDate !== null && e.billDueDate >= today)
        .sort((a, b) => (a.billDueDate! < b.billDueDate! ? -1 : 1)),
    [snapshot, today],
  )
  const markedDays = useMemo(() => new Set(upcoming.map((e) => e.billDueDate!)), [upcoming])

  return (
    <div className="screen">
      <NavBar title="Overview" />
      <div className="screen__body">
        <div className="screen__content">
          <CardSurface padding={22}>
            <div className="streak">
              <div className="vstack" style={{ gap: 2 }}>
                <span className="streak__label">days spend-free</span>
                <span className="streak__count tabular">{streak}</span>
                <span className="streak__label">{streak === 1 ? 'day in a row' : 'days in a row'}</span>
              </div>
              <button type="button" className="streak__info" aria-label="Choose which envelopes are off limits" onClick={() => setConfiguring(true)}>
                <Icon name="info.circle" size={22} />
              </button>
            </div>
          </CardSurface>

          <CardSurface>
            <div className="vstack" style={{ gap: 'var(--space-medium)' }}>
              <MonthNav month={visibleMonth} onChange={setVisibleMonth} />
              <MonthCalendarGrid month={visibleMonth} statuses={monthStatuses} markedDays={markedDays} today={today} />
              <div className="legend-dots">
                <LegendDot color="var(--color-spend-free)" label="spend-free" />
                <LegendDot color="var(--color-spend-broken)" label="you spent" />
                <LegendDot color="var(--color-accent)" label="bill due" />
              </div>
            </div>
          </CardSurface>

          {cycle ? (
            <CardSurface>
              <div className="next-budget">
                <span className="next-budget__emoji emoji">🗓️</span>
                <div className="vstack" style={{ gap: 2 }}>
                  <span className="next-budget__label">Next budget</span>
                  <span className="next-budget__date">{formatDay(cycle.nextBudgetDate, 'longWeekdayMonthDay')}</span>
                </div>
                <span className="spacer" />
                {isBudgetDue(cycle, today) ? <ChipButton title="budget now" icon="sparkles" onClick={route.budget} /> : null}
              </div>
            </CardSurface>
          ) : null}

          {upcoming.length > 0 ? (
            <div className="vstack" style={{ gap: 'var(--space-small)' }}>
              <SectionHeader title="Coming up" />
              <CardSurface>
                {upcoming.slice(0, 6).map((envelope, index, list) => (
                  <div key={envelope.id}>
                    <div className="row" style={{ padding: 'var(--space-small) 0' }}>
                      <EmojiBadge emoji={envelope.emoji} tint={kindColor(envelope.kind)} size={34} />
                      <div className="row__body">
                        <span className="row__title">{envelope.name}</span>
                        <span className="row__subtitle">{formatDay(envelope.billDueDate!, 'monthDay')}</span>
                      </div>
                      <AmountText amount={envelope.billAmountMinorUnits ?? 0} font="t-callout" />
                    </div>
                    {index < list.length - 1 ? <div className="divider" /> : null}
                  </div>
                ))}
              </CardSurface>
            </div>
          ) : null}
        </div>
      </div>

      <Sheet isOpen={isConfiguring} onDismiss={() => setConfiguring(false)}>
        {isConfiguring ? <NoSpendSettingsSheet onClose={() => setConfiguring(false)} /> : null}
      </Sheet>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="legend-dot">
      <span className="legend-dot__swatch" style={{ background: color }} />
      <span>{label}</span>
    </span>
  )
}
