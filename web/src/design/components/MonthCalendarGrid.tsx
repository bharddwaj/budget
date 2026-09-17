import { useState } from 'react'
import {
  addMonths,
  daysInMonth,
  dayKey,
  formatDay,
  parseDay,
  startOfMonth,
  todayKey,
  weekdayIndex,
  weekdaySymbols,
  type DayKey,
} from '../../domain/dates'
import type { DayStatuses } from '../../domain/noSpendEvaluator'
import { Icon } from '../Icon'

interface MonthCalendarGridProps {
  /** Any day in the month to show. */
  month: DayKey
  statuses?: DayStatuses
  /** Days to flag with an accent dot, e.g. upcoming bills. */
  markedDays?: Set<DayKey>
  /** When set, the grid is a picker: the selected day is highlighted and taps call `onSelect`. */
  selected?: DayKey | null
  minDay?: DayKey | null
  onSelect?: (day: DayKey) => void
  today?: DayKey
}

/**
 * A month laid out as a 7-column grid, each day tinted by its spend-free
 * status, with a dot under days that have a bill due. Doubles as a date picker.
 */
export function MonthCalendarGrid({
  month,
  statuses,
  markedDays,
  selected = null,
  minDay = null,
  onSelect,
  today = todayKey(),
}: MonthCalendarGridProps) {
  const first = startOfMonth(month)
  const { year, month: monthNumber } = parseDay(first)
  const count = daysInMonth(year, monthNumber)
  const leadingBlanks = weekdayIndex(first)
  const symbols = weekdaySymbols()
  const days = Array.from({ length: count }, (_, index) => dayKey(year, monthNumber, index + 1))
  const interactive = onSelect !== undefined

  return (
    <div className="cal">
      <div className="cal__weekdays">
        {symbols.map((symbol, index) => (
          <span key={index} className="cal__weekday">
            {symbol}
          </span>
        ))}
      </div>
      <div className="cal__grid">
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <div key={`blank-${index}`} />
        ))}
        {days.map((day) => {
          const status = statuses?.get(day) ?? 'untracked'
          const isToday = day === today
          const isSelected = selected === day
          const isDisabled = minDay !== null && day < minDay
          const classes = [
            'cal__cell',
            `cal__cell--${status}`,
            isToday ? 'cal__cell--today' : '',
            isSelected ? 'cal__cell--selected' : '',
            isDisabled ? 'cal__cell--disabled' : '',
          ].join(' ')
          const label = `${formatDay(day, 'monthDay')}${status === 'spendFree' ? ', spend-free' : status === 'spent' ? ', you spent' : status === 'upcoming' ? ', upcoming' : ''}`
          const content = (
            <>
              <span>{parseDay(day).day}</span>
              <span className={`cal__dot ${markedDays?.has(day) ? 'cal__dot--on' : ''}`} />
            </>
          )
          return interactive ? (
            <button key={day} type="button" className={classes} disabled={isDisabled} aria-label={label} aria-pressed={isSelected} onClick={() => onSelect(day)}>
              {content}
            </button>
          ) : (
            <div key={day} className={classes} aria-label={label}>
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface MonthNavProps {
  month: DayKey
  onChange: (month: DayKey) => void
}

/** `‹ September 2026 ›` */
export function MonthNav({ month, onChange }: MonthNavProps) {
  return (
    <div className="cal__nav">
      <button type="button" className="cal__nav-button" aria-label="Previous month" onClick={() => onChange(addMonths(startOfMonth(month), -1))}>
        <Icon name="chevron.left" size={20} strokeWidth={2.4} />
      </button>
      <span className="cal__nav-title">{formatDay(month, 'monthYear')}</span>
      <button type="button" className="cal__nav-button" aria-label="Next month" onClick={() => onChange(addMonths(startOfMonth(month), 1))}>
        <Icon name="chevron.right" size={20} strokeWidth={2.4} />
      </button>
    </div>
  )
}

interface DatePickerProps {
  value: DayKey
  minDay?: DayKey | null
  onChange: (day: DayKey) => void
}

/** A graphical date picker: month nav plus a selectable grid. */
export function DatePicker({ value, minDay = null, onChange }: DatePickerProps) {
  const [month, setMonth] = useState(() => startOfMonth(value))
  return (
    <div className="vstack" style={{ gap: 'var(--space-small)' }}>
      <MonthNav month={month} onChange={setMonth} />
      <MonthCalendarGrid month={month} selected={value} minDay={minDay} onSelect={onChange} />
    </div>
  )
}
