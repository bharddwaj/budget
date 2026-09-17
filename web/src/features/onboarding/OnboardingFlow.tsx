import { useState } from 'react'
import { useStore } from '../../app/AppEnvironment'
import { completeOnboarding } from '../../data/store/ops'
import { BUDGET_FREQUENCIES, frequencyTitle, type BudgetFrequency } from '../../domain/budgetFrequency'
import type { Money } from '../../domain/money'
import { Icon } from '../../design/Icon'
import { kindColor } from '../../design/kinds'
import { AmountEntrySheet } from '../../design/components/AmountEntrySheet'
import { AmountText } from '../../design/components/AmountText'
import { CardSurface } from '../../design/components/CardSurface'
import { PillButton } from '../../design/components/PillButton'
import { ProgressTrack } from '../../design/components/ProgressTrack'
import { STARTER_ENVELOPES } from './starterEnvelopes'
import './onboarding.css'

const PAGE_COUNT = 4

/**
 * First run: what the app is, how often you get paid, a starter set of
 * envelopes, and how much you have. It ends by dropping you straight into your
 * first budget, which is the only way the rest of the app makes sense.
 */
export function OnboardingFlow() {
  const store = useStore()
  const [page, setPage] = useState(0)
  const [frequency, setFrequency] = useState<BudgetFrequency>('biweekly')
  const [selected, setSelected] = useState<Set<string>>(() => new Set(STARTER_ENVELOPES.map((s) => s.name)))
  const [totalCash, setTotalCash] = useState<Money>(0)
  const [isEditingCash, setEditingCash] = useState(false)

  function finish() {
    const starters = STARTER_ENVELOPES.filter((s) => selected.has(s.name))
    store.commit(completeOnboarding(store.getSnapshot(), starters, frequency, totalCash, store.clock()))
  }

  function toggle(name: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <div className="onboarding">
      <div className="onboarding__progress">
        <ProgressTrack progress={(page + 1) / PAGE_COUNT} tint="var(--color-accent)" />
      </div>

      <div className="onboarding__page" key={page}>
        {page === 0 ? (
          <Page emoji="💌" title="Cash stuffing, without the cash" body="Give every dollar a job by putting it into an envelope. Spend from the envelope, and when it's empty, it's empty.">
            <CardSurface>
              <div className="vstack" style={{ gap: 'var(--space-medium)' }}>
                <Bullet emoji="🛒" text="Variable envelopes for costs that move around." />
                <Bullet emoji="🏠" text="Fixed envelopes for bills, with reminders." />
                <Bullet emoji="🛟" text="Savings envelopes for the things you're working toward." />
              </div>
            </CardSurface>
          </Page>
        ) : null}

        {page === 1 ? (
          <Page emoji="🗓️" title="How often do you get paid?" body="This becomes your budget rhythm. You can change it any time.">
            <CardSurface>
              {BUDGET_FREQUENCIES.map((candidate, index) => (
                <div key={candidate}>
                  <button type="button" className="option-row" onClick={() => setFrequency(candidate)}>
                    <span className="t-body c-primary">{frequencyTitle(candidate)}</span>
                    <span className={`option-row__check ${frequency === candidate ? 'option-row__check--on' : 'option-row__check--off'}`}>
                      <Icon name={frequency === candidate ? 'checkmark.circle.fill' : 'circle'} size={22} />
                    </span>
                  </button>
                  {index < BUDGET_FREQUENCIES.length - 1 ? <div className="divider" /> : null}
                </div>
              ))}
            </CardSurface>
          </Page>
        ) : null}

        {page === 2 ? (
          <Page emoji="🧧" title="Pick your starting envelopes" body="Just enough to get going — you can add, rename and delete them later.">
            <div className="starter-grid">
              {STARTER_ENVELOPES.map((starter) => {
                const isSelected = selected.has(starter.name)
                return (
                  <button
                    key={starter.name}
                    type="button"
                    className={`starter ${isSelected ? 'starter--selected' : ''}`}
                    style={isSelected ? ({ background: kindColor(starter.kind), '--icon-check-color': kindColor(starter.kind) } as React.CSSProperties) : undefined}
                    onClick={() => toggle(starter.name)}
                    aria-pressed={isSelected}
                  >
                    <span className="emoji">{starter.emoji}</span>
                    <span className="starter__name">{starter.name}</span>
                    <Icon name={isSelected ? 'checkmark.circle.fill' : 'circle'} size={14} />
                  </button>
                )
              })}
            </div>
          </Page>
        ) : null}

        {page === 3 ? (
          <Page emoji="💰" title="How much do you have right now?" body="Add up your accounts and any cash. This is what you'll be stuffing.">
            <CardSurface background="var(--color-accent-soft)" onClick={() => setEditingCash(true)}>
              <div className="cash-card">
                <AmountText amount={totalCash} font="t-hero" />
                <span className="cash-card__hint">tap to enter</span>
              </div>
            </CardSurface>
          </Page>
        ) : null}
      </div>

      <div className="pinned-actions">
        <PillButton title={page === PAGE_COUNT - 1 ? "let's budget" : 'next'} onClick={() => (page === PAGE_COUNT - 1 ? finish() : setPage(page + 1))} />
        {page > 0 ? <PillButton title="back" style="quiet" onClick={() => setPage(page - 1)} /> : null}
      </div>

      <AmountEntrySheet
        isOpen={isEditingCash}
        title="How much do you have?"
        caption="Every bank account, plus any cash."
        amount={totalCash}
        onDone={(amount) => {
          setTotalCash(amount)
          setEditingCash(false)
        }}
        onCancel={() => setEditingCash(false)}
      />
    </div>
  )
}

function Page({ emoji, title, body, children }: { emoji: string; title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="onboarding__page-content">
      <span className="onboarding__emoji emoji">{emoji}</span>
      <div className="onboarding__heading">
        <h1 className="onboarding__title" style={{ margin: 0 }}>{title}</h1>
        <p className="onboarding__body" style={{ margin: 0 }}>{body}</p>
      </div>
      {children}
    </div>
  )
}

function Bullet({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="onboarding__bullet">
      <span className="emoji">{emoji}</span>
      <span>{text}</span>
    </div>
  )
}
