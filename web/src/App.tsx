import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { useCurrencyFormat, useSnapshot, useStore } from './app/AppEnvironment'
import { router } from './app/router'
import { OnboardingFlow } from './features/onboarding/OnboardingFlow'
import { fireDueReminders } from './features/settings/reminders'

/** Decides what the app shows at launch: onboarding or the tab shell. */
export default function App() {
  const store = useStore()
  const snapshot = useSnapshot()
  const format = useCurrencyFormat()
  const { settings } = snapshot

  // Reminders can only fire while the page is open; check on load, on return
  // to the foreground, and every few minutes in between.
  useEffect(() => {
    const check = () => fireDueReminders(store.getSnapshot(), store.clock().today, new Date(), format)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisibility)
    check()
    const interval = window.setInterval(check, 5 * 60 * 1000)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(interval)
    }
  }, [store, format])

  // Ask the browser to keep our storage once there is something worth keeping.
  useEffect(() => {
    if (settings.hasOnboarded) navigator.storage?.persist?.().catch(() => {})
  }, [settings.hasOnboarded])

  if (!settings.hasOnboarded) return <OnboardingFlow />
  return <RouterProvider router={router} />
}
