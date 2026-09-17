import { createHashRouter } from 'react-router'
import { HomeView } from '../features/home/HomeView'
import { TransactionsView } from '../features/transactions/TransactionsView'
import { EnvelopeDetailView } from '../features/envelopes/EnvelopeDetailView'
import { OverviewCalendarView } from '../features/calendar/OverviewCalendarView'
import { InsightsView } from '../features/insights/InsightsView'
import { MainTabView } from './MainTabView'

/**
 * Tabs and the envelope detail push are routes; sheets and the budget flow
 * are presentation state, as on iOS. Hash routing needs no server fallback on
 * GitHub Pages and is invisible once the app is installed.
 */
export const router = createHashRouter([
  {
    path: '/',
    Component: MainTabView,
    children: [
      { index: true, Component: HomeView },
      { path: 'money', Component: TransactionsView },
      { path: 'overview', Component: OverviewCalendarView },
      { path: 'recap', Component: InsightsView },
      { path: 'envelopes/:id', Component: EnvelopeDetailView },
    ],
  },
])
