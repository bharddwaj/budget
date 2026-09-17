import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useSnapshot, useStore, useCurrencyFormat } from '../../app/AppEnvironment'
import { useAppRoute } from '../../app/AppRoute'
import { activeCycle, daysUntilNextBudget, isBillOutstanding, isBudgetDue, sortedEnvelopes, totalOnHand } from '../../data/store/derive'
import { frequencyAdverb } from '../../domain/budgetFrequency'
import { formatMoney } from '../../domain/currencyFormat'
import { ENVELOPE_KIND_ORDER, kindSectionTitle, kindTitle } from '../../domain/envelopeKind'
import { total } from '../../domain/money'
import { Icon } from '../../design/Icon'
import { kindColor } from '../../design/kinds'
import { AmountText } from '../../design/components/AmountText'
import { CardSurface } from '../../design/components/CardSurface'
import { DonutChart, DonutLegend, type DonutSlice } from '../../design/components/DonutChart'
import { SectionHeader } from '../../design/components/EmojiBadge'
import { Menu } from '../../design/components/Menu'
import { NavBar, NavIconButton } from '../../design/components/NavBar'
import { PillButton } from '../../design/components/PillButton'
import { EnvelopeRow } from '../envelopes/EnvelopeRow'
import './home.css'

/** The main screen: the donut of where your money sits, the budget-day banner, and every envelope. */
export function HomeView() {
  const store = useStore()
  const snapshot = useSnapshot()
  const route = useAppRoute()
  const format = useCurrencyFormat()
  const navigate = useNavigate()
  const today = store.clock().today
  const cycle = activeCycle(snapshot)
  const envelopes = useMemo(() => sortedEnvelopes(snapshot), [snapshot])

  const slices: DonutSlice[] = ENVELOPE_KIND_ORDER.map((kind) => ({
    id: kind,
    label: kindTitle(kind),
    amount: total(envelopes.filter((e) => e.kind === kind).map((e) => e.balanceMinorUnits)),
    color: kindColor(kind),
  }))
  const outstandingBills = envelopes.filter((e) => isBillOutstanding(e, today))

  return (
    <div className="screen">
      <NavBar
        title="Your envelopes"
        leading={<NavIconButton icon="plus" label="Add a transaction" onClick={() => route.addTransaction()} />}
        trailing={
          <Menu
            items={[
              { title: 'Start new budget', icon: 'sparkles', onSelect: route.budget },
              { title: 'Create new envelope', icon: 'plus.circle', onSelect: route.createEnvelope },
              { title: 'Transfer between envelopes', icon: 'arrow.left.arrow.right', onSelect: () => route.transfer() },
              { title: 'Arrange envelopes', icon: 'arrow.up.arrow.down', onSelect: route.arrange },
              'divider',
              { title: 'Settings', icon: 'gearshape', onSelect: route.settings },
            ]}
          />
        }
      />
      <div className="screen__body">
        <div className="screen__content">
          {cycle && isBudgetDue(cycle, today) ? (
            <CardSurface background="var(--color-accent-soft)" onClick={route.budget}>
              <div className="banner">
                <span className="banner__emoji emoji">✨</span>
                <div className="vstack" style={{ gap: 2 }}>
                  <span className="banner__title">It's budget day</span>
                  <span className="banner__subtitle">Let's stuff your envelopes for the next {frequencyAdverb(cycle.frequency).replace('every ', '')}</span>
                </div>
                <Icon name="chevron.right" size={14} strokeWidth={3} className="icon" />
              </div>
            </CardSurface>
          ) : null}

          <CardSurface padding={22}>
            <div className="summary">
              <DonutChart slices={slices} centerTitle="you have" centerAmount={totalOnHand(snapshot)} />
              <DonutLegend slices={slices} />
              {cycle ? (
                <>
                  <div className="divider" style={{ width: '100%' }} />
                  <div className="summary__next">
                    <span className="c-secondary">Next budget</span>
                    <span className="c-primary">{nextBudgetText(daysUntilNextBudget(cycle, today))}</span>
                  </div>
                </>
              ) : null}
            </div>
          </CardSurface>

          {outstandingBills.length > 0 ? (
            <CardSurface background="color-mix(in srgb, var(--color-warning) 10%, transparent)">
              <div className="vstack" style={{ gap: 'var(--space-small)' }}>
                <SectionHeader title="Waiting to be paid" tint="var(--color-warning)" />
                {outstandingBills.map((envelope) => (
                  <div key={envelope.id} className="bills__row">
                    <span className="emoji">{envelope.emoji}</span>
                    <span className="bills__name">{envelope.name}</span>
                    <span className="spacer" />
                    <AmountText amount={envelope.billAmountMinorUnits ?? envelope.balanceMinorUnits} font="t-callout" color="var(--color-warning)" />
                  </div>
                ))}
              </div>
            </CardSurface>
          ) : null}

          {envelopes.length === 0 ? (
            <CardSurface padding={22}>
              <div className="empty">
                <span className="empty__emoji emoji">🧧</span>
                <h2 className="empty__title">No envelopes yet</h2>
                <p className="empty__body">Make one for each thing you spend on, then stuff them on your budget day.</p>
                <PillButton title="create an envelope" icon="plus" onClick={route.createEnvelope} />
              </div>
            </CardSurface>
          ) : (
            ENVELOPE_KIND_ORDER.map((kind) => {
              const group = envelopes.filter((e) => e.kind === kind)
              if (group.length === 0) return null
              return (
                <div key={kind} className="vstack" style={{ gap: 'var(--space-small)' }}>
                  <SectionHeader title={kindSectionTitle(kind)} tint={kindColor(kind)} trailing={formatMoney(format, total(group.map((e) => e.balanceMinorUnits)))} />
                  <CardSurface>
                    {group.map((envelope, index) => (
                      <div key={envelope.id}>
                        <EnvelopeRow snapshot={snapshot} envelope={envelope} cycle={cycle} today={today} onClick={() => navigate(`/envelopes/${envelope.id}`)} />
                        {index < group.length - 1 ? <div className="divider" /> : null}
                      </div>
                    ))}
                  </CardSurface>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function nextBudgetText(days: number): string {
  if (days < 0) return 'Overdue'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `in ${days} days`
}
