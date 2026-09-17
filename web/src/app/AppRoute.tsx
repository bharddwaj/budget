import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react'
import type { Id } from '../data/types'

/**
 * Shared presentation state, so a button on any screen can open any sheet
 * without each screen owning its own copy. A port of the iOS `AppRoute`.
 */
export interface RouteState {
  isAddingTransaction: boolean
  editingTransactionID: Id | null
  /** Pre-selects an envelope when adding from its detail screen. */
  transactionEnvelopeID: Id | null
  isCreatingEnvelope: boolean
  editingEnvelopeID: Id | null
  isTransferring: boolean
  transferSourceID: Id | null
  isArrangingEnvelopes: boolean
  isBudgeting: boolean
  isShowingSettings: boolean
}

type Action =
  | { type: 'addTransaction'; envelopeID?: Id }
  | { type: 'editTransaction'; id: Id }
  | { type: 'closeTransaction' }
  | { type: 'createEnvelope' }
  | { type: 'editEnvelope'; id: Id }
  | { type: 'closeEnvelope' }
  | { type: 'transfer'; sourceID?: Id }
  | { type: 'closeTransfer' }
  | { type: 'arrange' }
  | { type: 'closeArrange' }
  | { type: 'budget' }
  | { type: 'closeBudget' }
  | { type: 'settings' }
  | { type: 'closeSettings' }

const initial: RouteState = {
  isAddingTransaction: false,
  editingTransactionID: null,
  transactionEnvelopeID: null,
  isCreatingEnvelope: false,
  editingEnvelopeID: null,
  isTransferring: false,
  transferSourceID: null,
  isArrangingEnvelopes: false,
  isBudgeting: false,
  isShowingSettings: false,
}

function reducer(state: RouteState, action: Action): RouteState {
  switch (action.type) {
    case 'addTransaction':
      return { ...state, isAddingTransaction: true, editingTransactionID: null, transactionEnvelopeID: action.envelopeID ?? null }
    case 'editTransaction':
      return { ...state, isAddingTransaction: true, editingTransactionID: action.id, transactionEnvelopeID: null }
    case 'closeTransaction':
      return { ...state, isAddingTransaction: false }
    case 'createEnvelope':
      return { ...state, isCreatingEnvelope: true, editingEnvelopeID: null }
    case 'editEnvelope':
      return { ...state, isCreatingEnvelope: true, editingEnvelopeID: action.id }
    case 'closeEnvelope':
      return { ...state, isCreatingEnvelope: false }
    case 'transfer':
      return { ...state, isTransferring: true, transferSourceID: action.sourceID ?? null }
    case 'closeTransfer':
      return { ...state, isTransferring: false }
    case 'arrange':
      return { ...state, isArrangingEnvelopes: true }
    case 'closeArrange':
      return { ...state, isArrangingEnvelopes: false }
    case 'budget':
      return { ...state, isBudgeting: true }
    case 'closeBudget':
      return { ...state, isBudgeting: false }
    case 'settings':
      return { ...state, isShowingSettings: true }
    case 'closeSettings':
      return { ...state, isShowingSettings: false }
  }
}

export interface AppRoute {
  state: RouteState
  addTransaction: (envelopeID?: Id) => void
  editTransaction: (id: Id) => void
  closeTransaction: () => void
  createEnvelope: () => void
  editEnvelope: (id: Id) => void
  closeEnvelope: () => void
  transfer: (sourceID?: Id) => void
  closeTransfer: () => void
  arrange: () => void
  closeArrange: () => void
  budget: () => void
  closeBudget: () => void
  settings: () => void
  closeSettings: () => void
}

const RouteContext = createContext<AppRoute | null>(null)

export function AppRouteProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial)
  const value = useMemo<AppRoute>(
    () => ({
      state,
      addTransaction: (envelopeID) => dispatch({ type: 'addTransaction', envelopeID }),
      editTransaction: (id) => dispatch({ type: 'editTransaction', id }),
      closeTransaction: () => dispatch({ type: 'closeTransaction' }),
      createEnvelope: () => dispatch({ type: 'createEnvelope' }),
      editEnvelope: (id) => dispatch({ type: 'editEnvelope', id }),
      closeEnvelope: () => dispatch({ type: 'closeEnvelope' }),
      transfer: (sourceID) => dispatch({ type: 'transfer', sourceID }),
      closeTransfer: () => dispatch({ type: 'closeTransfer' }),
      arrange: () => dispatch({ type: 'arrange' }),
      closeArrange: () => dispatch({ type: 'closeArrange' }),
      budget: () => dispatch({ type: 'budget' }),
      closeBudget: () => dispatch({ type: 'closeBudget' }),
      settings: () => dispatch({ type: 'settings' }),
      closeSettings: () => dispatch({ type: 'closeSettings' }),
    }),
    [state],
  )
  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>
}

export function useAppRoute(): AppRoute {
  const route = useContext(RouteContext)
  if (!route) throw new Error('useAppRoute must be used inside AppRouteProvider')
  return route
}
