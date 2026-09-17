import { addDays, startOfMonth, type DayKey } from '../../domain/dates'

export type DateRangeFilter = 'thisWeek' | 'thisMonth' | 'threeMonths' | 'allTime'

export const DATE_RANGE_FILTERS: readonly DateRangeFilter[] = ['thisWeek', 'thisMonth', 'threeMonths', 'allTime']

export function dateRangeTitle(filter: DateRangeFilter): string {
  switch (filter) {
    case 'thisWeek':
      return 'This week'
    case 'thisMonth':
      return 'This month'
    case 'threeMonths':
      return '3 months'
    case 'allTime':
      return 'All time'
  }
}

/** The first day inside the window, or null for all time. */
export function dateRangeStart(filter: DateRangeFilter, today: DayKey): DayKey | null {
  switch (filter) {
    case 'thisWeek':
      return addDays(today, -7)
    case 'thisMonth':
      return startOfMonth(today)
    case 'threeMonths':
      return addDays(today, -90)
    case 'allTime':
      return null
  }
}
