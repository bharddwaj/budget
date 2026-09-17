# Budget Bestie (clone)

A native SwiftUI iPhone app that reimplements the envelope / cash-stuffing
budgeting flow of [Budget Bestie](https://apps.apple.com/us/app/budget-bestie/id6460258044):
you run a budget on your pay schedule, stuff every dollar into an envelope, spend
from those envelopes, and repeat.

Everything is local. No account, no server, no bank linking, no paywall.

---

## Opening it

```bash
open BudgetBestie.xcodeproj
```

Requires **Xcode 16+** and an **iOS 17+** simulator or device. The project uses
Xcode 16 synchronized folder groups, so files under `BudgetBestie/` are picked up
automatically — you never have to add them to the target by hand.

If the project file ever fails to open, regenerate it:

```bash
brew install xcodegen && xcodegen generate
```

`project.yml` is the equivalent definition and is the spec if the two disagree.

## Running the logic tests

The domain logic lives in a Foundation-only Swift package so it can be built and
tested anywhere, with or without Xcode:

```bash
cd Packages/BudgetKit && swift test
```

That covers the date math, the three suggestion formulas, the keypad state
machine, money arithmetic, currency formatting and the spend-free evaluator —
the parts most likely to be subtly wrong.

---

## How it's laid out

```
Packages/BudgetKit/        Foundation-only domain logic + tests
BudgetBestie/
  App/                     Entry point, tab shell, routing, Face ID gate
  Design/                  Palette, type/spacing tokens, shared components
  Data/                    SwiftData models, the store, sample data
  Features/
    Onboarding/            First-run flow
    Home/                  Envelope list, donut, budget-day banner
    Budget/                The four-step budget flow
    Envelopes/             Detail, editor, transfer, merge, arrange
    Transactions/          Ledger, editor, in/out chart
    Calendar/              Spend-free calendar and streak
    Insights/              Recap
    Settings/              Reminders, currency, theme, danger zone
```

### Two rules the code holds to

**Money is never a `Double`.** `BudgetKit.Money` stores whole cents. Division
rounds to the nearest cent and `split(into:)` distributes the remainder so a
divided amount always sums back to the original.

**Balances are never written directly.** Every change goes through `BudgetStore`,
which records a `Transaction` and moves the envelope balance together. That is
why the home screen, the envelope detail and the recap can't drift apart.

### The suggestion rules

The `suggested` button on the keypad follows the same three rules the real app
documents, each then reduced by whatever the envelope already holds so a
rollover tops up instead of stuffing twice:

| Type | Suggestion |
|---|---|
| Variable | Average spent there over the last 90 days, pro-rated to one budget cycle |
| Fixed | Bill total ÷ number of budgets between now and the due date |
| Savings | Goal remaining ÷ number of budgets before the deadline |

---

## What's here

Onboarding · envelopes of all three types (create, edit, change type, reorder,
transfer, merge, retire/unretire, delete) · the four-step budget flow with the
stuffing keypad and per-envelope suggestions · transactions (add, edit, delete,
recurring, income) · the spend-free calendar with streaks and per-envelope
off-limits settings · the recap tab · the four reminder types · Face ID lock ·
light/dark themes · customisable currency · start fresh / delete all data.

## What's not, yet

- **Home-screen widgets.** These need a second WidgetKit target plus an App
  Group. Add it in Xcode on the Mac (File ▸ New ▸ Target ▸ Widget Extension) —
  two clicks there, versus hand-editing the project file blind.
- **App icon.** `AppIcon.appiconset` is an empty 1024×1024 slot.
- **Couples / shared budgeting.** Needs a backend, which this build deliberately
  doesn't have.

## Acceptance walkthrough

1. Launch on a clean simulator → onboarding appears; pick a frequency, some
   starter envelopes, and a cash amount.
2. The budget flow opens. Stuff until "left to stuff" reads $0.00, then review
   and create the budget.
3. Home shows the donut, the totals per type, and each envelope's bar.
4. Tap `+`, record an expense → the envelope balance and the donut both move.
5. Overview tab → today is green; the day you just spent on an off-limits
   envelope is red, and the streak reflects it.
6. Settings ▸ turn on Face ID, background and reopen → the lock screen appears.

---

## Web app (PWA)

The same app, rebuilt for the browser so it can be installed from a link
with no signing or expiry — Safari ▸ Share ▸ **Add to Home Screen**.

**Live:** https://bharddwaj.github.io/budget/

Everything is local-first: data lives in the browser's IndexedDB. Accounts and
cross-device sync (Firebase Auth + Firestore) are the next step.

```bash
cd web
npm install
npm run dev        # http://localhost:5173/budget/
npm test           # vitest — domain + store tests
npm run typecheck
npm run build      # → web/dist
```

Pushing to `main` deploys `web/` to GitHub Pages via
`.github/workflows/deploy-web.yml` (repo Settings ▸ Pages ▸ Source must be
"GitHub Actions"). Layout: `web/src/domain` is a port of `BudgetKit`,
`web/src/data` is the storage layer (records → repository → Dexie), and
`web/src/features` mirrors `BudgetBestie/Features`.
