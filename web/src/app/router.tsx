import { createHashRouter } from 'react-router'
import { HomeView } from '../features/home/HomeView'
import { TransactionsView } from '../features/transactions/TransactionsView'
import { EnvelopeDetailView } from '../features/envelopes/EnvelopeDetailView'
import { MainTabView } from './MainTabView'

function Placeholder({ title }: { title: string }) {
  return (
    <div className="screen">
      <div className="navbar">
        <div />
        <div className="navbar__title">{title}</div>
        <div />
      </div>
      <div className="screen__body">
        <div className="screen__content">
          <span className="t-callout c-secondary">Coming soon.</span>
        </div>
      </div>
    </div>
  )
}

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
      { path: 'overview', element: <Placeholder title="Overview" /> },
      { path: 'recap', element: <Placeholder title="Your recap" /> },
      { path: 'envelopes/:id', Component: EnvelopeDetailView },
    ],
  },
])
