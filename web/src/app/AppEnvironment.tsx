import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import type { CurrencyFormat } from '../domain/currencyFormat'
import type { BudgetStore } from '../data/store/BudgetStore'
import type { Snapshot } from '../data/types'

/**
 * What every screen needs: the store, the current snapshot, and the user's
 * currency format. Mirrors the SwiftUI environment values RootView injects.
 */
const StoreContext = createContext<BudgetStore | null>(null)

export function AppEnvironment({ store, children }: { store: BudgetStore; children: ReactNode }) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)

  // Apply the theme choice to the document so the CSS tokens follow it.
  useEffect(() => {
    const root = document.documentElement
    if (snapshot.settings.theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', snapshot.settings.theme)
  }, [snapshot.settings.theme])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): BudgetStore {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside AppEnvironment')
  return store
}

export function useSnapshot(): Snapshot {
  const store = useStore()
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

export function useCurrencyFormat(): CurrencyFormat {
  const { settings } = useSnapshot()
  return useMemo(
    () => ({
      symbol: settings.currencySymbol,
      position: settings.currencySymbolIsLeading ? 'leading' : 'trailing',
      decimals: settings.currencyDecimals,
      groupingSeparator: settings.currencyGroupingSeparator,
      decimalSeparator: settings.currencyDecimalSeparator,
      usesMinusSign: true,
    }),
    [
      settings.currencySymbol,
      settings.currencySymbolIsLeading,
      settings.currencyDecimals,
      settings.currencyGroupingSeparator,
      settings.currencyDecimalSeparator,
    ],
  )
}
