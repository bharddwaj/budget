import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { commit, keypadState, press, type KeypadKey, type KeypadState } from '../../domain/keypadEngine'
import { kindTitle } from '../../domain/envelopeKind'
import { kindColor } from '../../design/kinds'
import { AmountText } from '../../design/components/AmountText'
import { BudgetKeypad, KeypadDisplay } from '../../design/components/BudgetKeypad'
import { CardSurface } from '../../design/components/CardSurface'
import { EmojiBadge } from '../../design/components/EmojiBadge'
import { PillButton } from '../../design/components/PillButton'
import { BudgetStepScaffold } from './BudgetStepScaffold'
import {
  currentEnvelope,
  isFullyAllocated,
  rationale,
  remaining,
  suggestedTarget,
  targetFor,
  type BudgetFlowAction,
  type BudgetFlowState,
} from './budgetFlow'

interface Props {
  state: BudgetFlowState
  dispatch: (action: BudgetFlowAction) => void
}

/**
 * Step 3 — stuffing. One envelope at a time, with the money still to place
 * counting down at the top until it hits $0.00.
 */
export function BudgetAllocationStep({ state, dispatch }: Props) {
  const envelope = currentEnvelope(state)
  const [keypad, setKeypad] = useState<KeypadState>(() => keypadState(envelope ? targetFor(state, envelope) : 0))
  const stripRef = useRef<HTMLDivElement>(null)

  // Load the envelope's target into the keypad whenever the flow moves on.
  const envelopeID = envelope?.id ?? null
  useEffect(() => {
    if (envelope) setKeypad(keypadState(targetFor(state, envelope)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envelopeID])

  const suggested = envelope ? suggestedTarget(state, envelope) : 0
  function handleKey(key: KeypadKey) {
    setKeypad((prev) => press(prev, key, suggested))
  }

  // Keep the running total honest while the user is still typing.
  useEffect(() => {
    if (envelope && state.targets[envelope.id] !== keypad.value) {
      dispatch({ type: 'setTarget', envelopeID: envelope.id, target: keypad.value })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keypad.value])

  useEffect(() => {
    const strip = stripRef.current
    const item = strip?.children[state.allocationIndex] as HTMLElement | undefined
    item?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [state.allocationIndex])

  const left = remaining(state)
  const isLast = state.allocationIndex === state.envelopes.length - 1
  const remainingColor = left === 0 ? 'var(--color-positive)' : left < 0 ? 'var(--color-negative)' : 'var(--color-text-primary)'
  const remainingBackground =
    left === 0
      ? 'color-mix(in srgb, var(--color-positive) 12%, transparent)'
      : left < 0
        ? 'color-mix(in srgb, var(--color-negative) 12%, transparent)'
        : 'var(--color-surface)'

  return (
    <BudgetStepScaffold
      contentGap={16}
      actions={
        envelope ? (
          <>
            <PillButton title={isLast ? 'review' : 'next'} onClick={() => dispatch({ type: 'commitAndAdvance', target: commit(keypad).value })} />
            <PillButton title="previous" style="quiet" onClick={() => dispatch({ type: 'stepBackInAllocation' })} />
          </>
        ) : (
          <PillButton title="previous" style="quiet" onClick={() => dispatch({ type: 'goBack' })} />
        )
      }
    >
      <CardSurface padding={10} background={remainingBackground}>
        <div className="remaining">
          <span className="remaining__label">{isFullyAllocated(state) ? 'all stuffed 🎉' : 'left to stuff'}</span>
          <AmountText amount={left} font="t-amount" color={remainingColor} />
        </div>
      </CardSurface>

      <div className="strip" ref={stripRef}>
        {state.envelopes.map((candidate, index) => (
          <button
            key={candidate.id}
            type="button"
            className={`strip__item ${index === state.allocationIndex ? 'strip__item--current' : ''}`}
            style={{ '--strip-tint': kindColor(candidate.kind) } as CSSProperties}
            aria-label={candidate.name}
            onClick={() => dispatch({ type: 'commitAndJump', target: commit(keypad).value, index })}
          >
            <span className="emoji">{candidate.emoji}</span>
          </button>
        ))}
      </div>

      {envelope ? (
        <>
          <CardSurface>
            <div className="envelope-card">
              <EmojiBadge emoji={envelope.emoji} tint={kindColor(envelope.kind)} size={50} />
              <div className="vstack" style={{ gap: 2 }}>
                <span className="envelope-card__name">{envelope.name}</span>
                <span className="envelope-card__kind" style={{ color: kindColor(envelope.kind) }}>
                  {kindTitle(envelope.kind)}
                </span>
              </div>
              <div className="envelope-card__was">
                <span className="envelope-card__was-label">was</span>
                <AmountText amount={envelope.balanceMinorUnits} font="t-callout" />
              </div>
            </div>
          </CardSurface>

          <KeypadDisplay state={keypad} caption={rationale(state, envelope)} />
          <BudgetKeypad onPress={handleKey} suggested={suggested} />
        </>
      ) : (
        <CardSurface>
          <span className="t-callout c-secondary" style={{ textAlign: 'center' }}>
            You don't have any envelopes yet.
          </span>
        </CardSurface>
      )}
    </BudgetStepScaffold>
  )
}
