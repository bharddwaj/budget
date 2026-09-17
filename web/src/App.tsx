import { RouterProvider } from 'react-router'
import { useSnapshot } from './app/AppEnvironment'
import { router } from './app/router'
import { OnboardingFlow } from './features/onboarding/OnboardingFlow'

/** Decides what the app shows at launch: onboarding or the tab shell. */
export default function App() {
  const { settings } = useSnapshot()
  if (!settings.hasOnboarded) return <OnboardingFlow />
  return <RouterProvider router={router} />
}
