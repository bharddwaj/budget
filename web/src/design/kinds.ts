import type { EnvelopeKind } from '../domain/envelopeKind'
import type { IconName } from './Icon'

/** The CSS colour token for an envelope type (EnvelopeKind.color on iOS). */
export function kindColor(kind: EnvelopeKind): string {
  return `var(--color-${kind})`
}

/** EnvelopeKind.symbolName on iOS. */
export function kindIcon(kind: EnvelopeKind): IconName {
  switch (kind) {
    case 'variable':
      return 'cart.fill'
    case 'fixed':
      return 'calendar.badge.clock'
    case 'savings':
      return 'banknote.fill'
  }
}
