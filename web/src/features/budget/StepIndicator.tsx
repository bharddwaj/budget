import { STEPS, type Step } from './budgetFlow'

/** Four dots along the top so it's clear how much of the flow is left. */
export function StepIndicator({ step }: { step: Step }) {
  const current = STEPS.indexOf(step)
  return (
    <div className="steps" aria-label={`Step ${current + 1} of ${STEPS.length}`} role="img">
      {STEPS.map((candidate, index) => (
        <span key={candidate} className={`steps__dot ${index <= current ? 'steps__dot--done' : ''} ${index === current ? 'steps__dot--current' : ''}`} />
      ))}
    </div>
  )
}
