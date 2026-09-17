import { describe, expect, it } from 'vitest'
import { addDays, addMonths, daysBetween, eachDay, endOfMonth, formatDay, keyFromDate, weekdayIndex } from '../dates'

describe('dates', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('adds days across a daylight-saving change without drifting', () => {
    // US DST began 2026-03-08.
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08')
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09')
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
  })

  it('adds months with end-of-month clamping', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29')
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-15')
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15')
  })

  it('knows the end of a month and weekdays', () => {
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28')
    // 2026-09-10 is a Thursday.
    expect(weekdayIndex('2026-09-10')).toBe(4)
  })

  it('enumerates days inclusively', () => {
    expect(eachDay('2026-03-30', '2026-04-01')).toEqual(['2026-03-30', '2026-03-31', '2026-04-01'])
  })

  it('derives keys from local dates', () => {
    expect(keyFromDate(new Date(2026, 8, 10, 23, 59))).toBe('2026-09-10')
  })

  it('formats for display', () => {
    expect(formatDay('2026-09-25', 'monthDay')).toBe('Sep 25')
    expect(formatDay('2026-09-25', 'monthDayYear')).toBe('Sep 25, 2026')
    expect(formatDay('2026-09-24', 'weekdayMonthDay')).toBe('Thu, Sep 24')
    expect(formatDay('2026-09-24', 'longWeekdayMonthDay')).toBe('Thursday, September 24')
    expect(formatDay('2026-09-24', 'monthYear')).toBe('September 2026')
  })
})
