/**
 * The three stuffing methods, which decide what extra fields an envelope
 * carries and how its suggested allocation is calculated.
 */
export type EnvelopeKind = 'variable' | 'fixed' | 'savings'

/** Order the home screen and the stuffing flow walk the envelope groups in. */
export const ENVELOPE_KIND_ORDER: readonly EnvelopeKind[] = ['variable', 'fixed', 'savings']

export function kindTitle(kind: EnvelopeKind): string {
  switch (kind) {
    case 'variable':
      return 'Variable'
    case 'fixed':
      return 'Fixed'
    case 'savings':
      return 'Savings'
  }
}

/** The plural heading used above each group on the home screen. */
export function kindSectionTitle(kind: EnvelopeKind): string {
  switch (kind) {
    case 'variable':
      return 'Variable envelopes'
    case 'fixed':
      return 'Fixed envelopes'
    case 'savings':
      return 'Savings envelopes'
  }
}

export function kindBlurb(kind: EnvelopeKind): string {
  switch (kind) {
    case 'variable':
      return 'For costs that change month to month, like groceries or fun money.'
    case 'fixed':
      return 'For bills that come on a schedule, like rent or your phone.'
    case 'savings':
      return "For money you're setting aside toward a goal."
  }
}

/**
 * Fixed bills are assumed spendable on a spend-free day, since paying rent is
 * not the kind of spending a no-spend streak is meant to discourage.
 */
export function isSpendFreeByDefault(kind: EnvelopeKind): boolean {
  return kind === 'fixed'
}

export function kindOrderIndex(kind: EnvelopeKind): number {
  return ENVELOPE_KIND_ORDER.indexOf(kind)
}
