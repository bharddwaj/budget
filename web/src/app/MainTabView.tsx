import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router'
import { activeCycle, sortedEnvelopes } from '../data/store/derive'
import { Icon, type IconName } from '../design/Icon'
import { Sheet } from '../design/components/Sheet'
import { BudgetFlowView } from '../features/budget/BudgetFlowView'
import { AppRouteProvider, useAppRoute } from './AppRoute'
import { useSnapshot } from './AppEnvironment'
import { SheetHost } from './SheetHost'

const tabs: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Envelopes', icon: 'tray.full.fill' },
  { to: '/money', label: 'Money', icon: 'list.bullet' },
  { to: '/overview', label: 'Overview', icon: 'calendar' },
  { to: '/recap', label: 'Recap', icon: 'chart.pie.fill' },
]

/**
 * The four tabs plus every sheet the app presents, so any tab can open the
 * add-transaction keypad or the budget flow.
 */
export function MainTabView() {
  return (
    <AppRouteProvider>
      <TabShell />
    </AppRouteProvider>
  )
}

function TabShell() {
  const snapshot = useSnapshot()
  const route = useAppRoute()

  // Fresh from onboarding (or after "start fresh") there are envelopes but no
  // budget yet, and nothing else makes sense until there is one.
  const needsFirstBudget = activeCycle(snapshot) === null && sortedEnvelopes(snapshot).length > 0
  useEffect(() => {
    if (needsFirstBudget) route.budget()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="screen">
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </div>
      <nav className="tabbar">
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className={({ isActive }) => `tabbar__item ${isActive ? 'tabbar__item--active' : ''}`}>
            <Icon name={tab.icon} size={24} strokeWidth={1.8} />
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>

      <Sheet isOpen={route.state.isBudgeting} onDismiss={route.closeBudget} presentation="cover">
        {route.state.isBudgeting ? <BudgetFlowView onClose={route.closeBudget} /> : null}
      </Sheet>
      <SheetHost />
    </div>
  )
}
