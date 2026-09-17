import type { StarterEnvelope } from '../../data/store/ops'

/** The starter envelopes offered during onboarding, in order. */
export const STARTER_ENVELOPES: readonly StarterEnvelope[] = [
  { emoji: '🛒', name: 'Groceries', kind: 'variable' },
  { emoji: '⛽️', name: 'Gas', kind: 'variable' },
  { emoji: '🍜', name: 'Eating out', kind: 'variable' },
  { emoji: '🎀', name: 'Fun money', kind: 'variable' },
  { emoji: '🏠', name: 'Rent', kind: 'fixed' },
  { emoji: '📱', name: 'Phone', kind: 'fixed' },
  { emoji: '💡', name: 'Utilities', kind: 'fixed' },
  { emoji: '🛟', name: 'Emergency fund', kind: 'savings' },
]
