import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './design/tokens.css'
import './design/base.css'
import './design/components/components.css'
import './design/components/shell.css'
import './design/components/keypad.css'
import './design/components/charts.css'
import './design/components/calendar.css'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { AppEnvironment } from './app/AppEnvironment'
import { DexieRepository } from './data/dexie/DexieRepository'
import { BudgetStore } from './data/store/BudgetStore'

if (import.meta.env.PROD) registerSW({ immediate: true })

const store = new BudgetStore(new DexieRepository())

store.load().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppEnvironment store={store}>
        <App />
      </AppEnvironment>
    </StrictMode>,
  )
})
