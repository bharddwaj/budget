# Budget Bestie clone — build handoff

A summary of how this app was built and tested, every decision that matters, and
where each piece of information came from, so work can continue in a new
conversation without re-deriving any of it. Written 2026-09-16 after the second
session (Mac). Pair with [README.md](README.md), which describes the app itself.

---

## 1. What this is

A native SwiftUI iPhone app that reimplements the envelope / cash-stuffing flow of
[Budget Bestie](https://apps.apple.com/us/app/budget-bestie/id6460258044).
Everything is local (SwiftData); no account, server, or paywall.

- **Repo:** https://github.com/bharddwaj/budget (branch `main`, remote `origin`)
- **Owner:** bharddwaj
- **Latest commit:** `106aacc` — working tree clean, fully pushed.

### History of the work

| Session | Machine | What happened |
|---|---|---|
| 1 | Windows (no Xcode) | The whole app was written blind: models, store, all screens, BudgetKit package + tests, `project.yml`, hand-edited `.pbxproj`. Commits `1cb4fa4`, `403e1ab`, `b49d1ee`. |
| 2 (this one) | MacBook, Xcode 26.6 | First time the code was compiled or run. Fixed the one compile error, ran the tests, drew the icon, walked the app end-to-end in the simulator against the README checklist, found and fixed 9 bugs, committed and pushed. Commits `7b65956` → `106aacc`. |

---

## 2. Environment facts (Mac)

These were all discovered by probing the machine, not assumed.

- **Xcode 26.6 (17F113)** at `/Applications/Xcode.app`. Simulator runtime iOS 26.5.
- `xcode-select` initially pointed at Command Line Tools; the user ran
  `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` mid-session.
  Until then, everything worked by exporting
  `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` per command — still a
  safe habit in scripts.
- **Simulator used:** iPhone 17, UDID `5F8FF032-D564-4F97-A6C4-72CE8F397A21`,
  402×874 points. Screenshots come back at 920×2000 px (≈2.29× points).
- **Bundle ID:** `com.budgetbestie.clone`.
- **No code-signing identity and no `DEVELOPMENT_TEAM`** in the project. Nothing
  has ever been built for a physical device. `gh` CLI is not installed; plain
  `git push` over HTTPS works.
- `rsvg-convert` (Homebrew) is available — used to rasterize the icon.

### Commands that work

```bash
# Build for the simulator (DerivedData kept out of the repo)
DD=/tmp/BudgetBestieDerivedData
xcodebuild -project BudgetBestie.xcodeproj -scheme BudgetBestie \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  -derivedDataPath $DD -configuration Debug build

# Install / launch / wipe
xcrun simctl install   booted $DD/Build/Products/Debug-iphonesimulator/BudgetBestie.app
xcrun simctl launch    booted com.budgetbestie.clone
xcrun simctl uninstall booted com.budgetbestie.clone   # clean slate → onboarding again

# Domain-logic tests (Foundation-only, no simulator needed)
cd Packages/BudgetKit && swift test      # 54 tests, all pass

# Face ID in the simulator
xcrun simctl spawn booted notifyutil -s com.apple.BiometricKit.enrollmentChanged 1
xcrun simctl spawn booted notifyutil -p com.apple.BiometricKit.enrollmentChanged   # enroll
xcrun simctl spawn booted notifyutil -p com.apple.BiometricKit_Sim.fingerTouch.match  # matching face

# Poke the SwiftData store directly (app must be terminated first)
C=$(xcrun simctl get_app_container booted com.budgetbestie.clone data)
sqlite3 "$C/Library/Application Support/default.store"
# Table ZAPPSETTINGS; dates are seconds since 2001-01-01 (add 978307200 for unix)
```

Simulator quirk worth knowing: **tapping a SwiftUI `Toggle` via injected tap
sometimes doesn't register** (the Face ID toggle needed three tries). A short
horizontal drag across the switch always works.

---

## 3. Architecture and the rules the code keeps

Layout is in README.md. The two invariants, both from the original design and
both still honoured after this session's changes:

1. **Money is never a `Double`.** `BudgetKit.Money` stores whole cents;
   division rounds and `split(into:)` distributes remainders.
2. **Balances are never written directly.** Every change goes through
   `BudgetStore`, which records a `Transaction` and moves the balance together.
   (Onboarding used to violate this — fixed, see §5.)

Other structural facts:

- `BudgetKit` (Swift package under `Packages/`) holds date math (`CycleCalendar`),
  the three suggestion formulas (`SuggestionEngine`), the keypad state machine
  (`KeypadEngine`), currency formatting, and the spend-free evaluator. It is
  Foundation-only so it can be tested anywhere.
- The app target uses **Xcode 16 synchronized folder groups** — files added under
  `BudgetBestie/` are picked up automatically. `project.yml` (xcodegen) is the
  fallback spec if the `.pbxproj` ever breaks.
- `AppRoute` (an `@Observable` in `MainTabView`) owns every sheet, so any tab can
  open the add-transaction keypad or the budget flow.
- `RootView` decides launch state: Face ID gate → onboarding → tabs.
- Settings live in a single SwiftData row (`AppSettings`), not `UserDefaults`, so
  "delete all data" is one wipe.

---

## 4. Keypad semantics (source of the first test failures)

The keypad is **cash-register style**: digits fill from the right, so `1`,`2`,`3`
= $1.23 and `1`,`00`,`00` = $100.00. `+`/`−` park the value; `=` resolves.
Four tests assumed `<digit>,00,00` = `$<digit>0.00` and were wrong; the engine
was right (the passing `testDoubleZero` already relied on the correct reading).
Fixed the tests, not the engine (`7b65956`).

---

## 5. Bugs found in the simulator and how they were fixed

All found by walking the README "Acceptance walkthrough" on a clean install.
Real-app behaviour was inferred from the README's own description of the flow
plus general knowledge of Budget Bestie — **no live side-by-side with the real app
was done.**

| # | Symptom | Root cause | Fix | Commit |
|---|---|---|---|---|
| 1 | Compile error in `BudgetFlowModel.init` | `self.envelopes` read before all stored props initialised | Use a local | `7b65956` |
| 2 | Budget flow never opened after onboarding; user landed on Home | `finish()` saved `hasOnboarded` *then* presented a sheet — the save swaps `OnboardingFlow` out for `MainTabView` in the same frame | `MainTabView.task` opens the flow when there are envelopes but no active cycle | `effa1dd` |
| 3 | All onboarding cash dumped into the first envelope | Hack to seed the flow's `totalCash` | New `AppSettings.startingCash`; first budget starts from it, cleared in `createBudget`. Every envelope now starts at $0 with the full amount "left to stuff", like the real app | `effa1dd` |
| 4 | "How often do you get paid?" ignored | `finish()` never stored it; flow defaulted to biweekly | New `AppSettings.preferredFrequency`, used when there's no previous cycle | `effa1dd` |
| 5 | Stuffing step overflowed under nav bar and past home indicator | Non-scrolling `VStack` taller than the screen | Wrapped in `ScrollView` with `.scrollBounceBehavior(.basedOnSize)` | `effa1dd` |
| 6 | Progress bars inverted (empty envelope = full bar) | `spentFraction` returned "how much is gone"; with nothing stuffed and $0 it returned 1 | Renamed to `remainingFraction`: full bar = full envelope, drains as you spend | `c0bd096` |
| 7 | In/out chart: zero line at top, "Sep 10" ×4 on x-axis | Auto y-domain with only negative bars; `.automatic(desiredCount: 4)` on a one-day window | Symmetric `chartYScale`; x labels `.stride(by: .day, count: span/4)` | `c0bd096` |
| 8 | Donut centre amount spilled into the ring at 5+ figures | No width constraint | Cap to 90% of hole diameter, `lineLimit(1)` + `minimumScaleFactor(0.5)`; `innerRadiusRatio` pulled into a constant | `c0bd096` |
| 9 | Changing theme/currency triggered the notification permission prompt | One `onChange` fingerprint covered every setting and always rescheduled | Split into `settingsFingerprint` (save) and `reminderFingerprint` (reschedule) | `880605b` |
| 10 | Face ID never re-locked after backgrounding (README step 6 impossible) | No `scenePhase` handling | `RootView` resets `isUnlocked` on `.background` | `880605b` |

**Not a bug, but easy to mistake for one:** trailing `$` (e.g. `2,487.50$`) is the
"Symbol before the amount" toggle in Settings ▸ Currency. Default is leading.

### Verified working (no changes needed)

Onboarding (all 4 pages) · stuffing with live "left to stuff" countdown · keypad
`+`/`=` math · review step totals · Home donut/totals · expense flows through
donut, ledger, calendar and recap · transaction editor with envelope picker and
past-date picker · envelope detail, editor (emoji picker, type, bill amount, due
date), retire/delete buttons present · dark theme · currency symbol position ·
Face ID lock on launch and on re-foreground · SwiftData lightweight migration
(installed over existing data after adding two settings fields) ·
**Overview calendar**, tested exhaustively: untracked days before tracking start,
green/red/upcoming, backdated expenses, off-limits toggles live-update the
calendar and streak, bill envelopes don't break streaks, streak counts back from
yesterday when today is broken, month navigation, bill-due dot + "Coming up" card.

---

## 6. App icon

`BudgetBestie/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon.png` —
1024×1024, a cute lavender hippo with pink cheeks, two teeth and a `$` coin.
Drawn as hand-written SVG and rasterized with `rsvg-convert`. The SVG source was
in a scratch directory and is **not** in the repo; if it needs changes, redraw
from the PNG or ask for the SVG to be recreated (it's ~50 lines of circles,
ellipses and one path).

---

## 7. Known cosmetic issues (left alone)

- "Emergency fund" truncates to "Emergenc…" in onboarding chips and the
  transaction envelope picker.
- Envelope lists in the transaction picker and the spend-free settings sheet
  interleave types (Groceries, Rent, Emergency, Gas, Phone…) because
  `sortIndex` is per-type. Fix: sort by `EnvelopeKind.displayOrder` then
  `sortIndex`.
- "Start fresh" (Settings) sets `noSpendTrackingStart = nil`. With `nil`, the
  evaluator treats every past day as spend-free, so the streak would jump to
  ~365. Should set `Date()` instead. **Identified, not yet fixed.**
- The lock screen shows "That didn't work" after a background/foreground cycle
  because the auto-prompt is interrupted by the app switch; the `unlock` button
  is the retry. Acceptable but could be smoother.

---

## 8. Current simulator state (not code — just so it isn't mistaken for a bug)

The iPhone 17 simulator currently has: Face ID enrolled and enabled in the app,
Dark theme selected, biweekly budget of $2,500 created Sep 10 (next Sep 24),
`noSpendTrackingStart` backdated to Aug 30 via sqlite, a $12.50 Eating-out
expense on Sep 10, $20 Groceries on Sep 7, $1,200 Rent on Sep 5, Groceries
toggled *off* off-limits, Rent given a $1,200 monthly bill due Sep 25, and
notification permission **denied** (tapped Don't Allow; `simctl privacy reset`
isn't supported on this runtime). `xcrun simctl uninstall` wipes all of it.

---

## 9. Distribution — the open decision

The user wants to run the app on their own iPhone. Facts established:

- iOS only runs apps signed for the device. There is no way to install a native
  app from a GitHub link. This is Apple policy, not a project limitation.
- **Free Apple ID + Xcode** works but certificates expire every **7 days**; renew
  by plugging in and ⌘R. AltStore/Sideloadly automate the re-sign but still use
  7-day certs. Max 3 such apps at once.
- **Paid Developer Program ($99/yr)** → TestFlight (90-day builds) or App Store.
- **EU alternative marketplaces** still require a paid account + Apple
  notarization, and are EU-only.
- **Enterprise / "UDID signing" resellers** exist but are revoked regularly and
  violate Apple's terms — not recommended.
- **Web app (PWA) on GitHub Pages** is the only path that is free, never expires,
  and needs no Mac: Safari ▸ Add to Home Screen. Requires rewriting the UI in
  HTML/JS with IndexedDB; BudgetKit logic ports cleanly. Face ID would become a
  PIN; reminders would rely on Safari web push (less reliable).

**User's stated constraints:** does not want to pay; does not want to re-sign
weekly, plug in, or depend on same-Wi-Fi refresh.

**Proposed (not yet agreed) plan:** single-page vanilla HTML/CSS/JS app, no build
step, IndexedDB storage, same screens/colours as the native app, GitHub Actions
deploy to GitHub Pages on push, native project kept in the repo untouched.
Pending the user's go-ahead.

To run on a device with the free-ID path in the meantime: Xcode ▸ Settings ▸
Accounts ▸ add Apple ID → project ▸ target ▸ Signing & Capabilities ▸ pick
Personal Team (change bundle ID if `com.budgetbestie.clone` is taken) → plug in
iPhone, trust, select as destination, ⌘R → on phone, Settings ▸ General ▸ VPN &
Device Management ▸ Trust.

---

## 10. Sources of information

| Fact | Source |
|---|---|
| App structure, invariants, suggestion formulas, acceptance checklist | `README.md`, `project.yml`, source under `BudgetBestie/` and `Packages/BudgetKit/` |
| What the real app does (onboarding → stuff to $0 → home → expense → calendar) | README's description of the flow + general knowledge of Budget Bestie. No live comparison. |
| Xcode version, simulator list, signing state, tool availability | Probed on the Mac (`xcodebuild -version`, `simctl list`, `security find-identity`, `which`) |
| All bug findings | Direct observation in the iPhone 17 simulator via the Claude Code iOS Simulator tool (screenshots, taps, sqlite inspection of the store) |
| SwiftData date encoding (seconds since 2001-01-01) | Core Data convention; verified by reading `ZNOSPENDTRACKINGSTART` back |
| Simulator Face ID `notifyutil` commands | Standard simulator trick; verified working here |
| iOS sideloading / 7-day limit / DMA / TestFlight facts | General knowledge of Apple's developer program and iOS 17.4+ DMA rules as of 2026; not fetched from the web this session |

---

## 11. Suggested next steps

1. Decide on distribution (§9). If web app: start with the data model + keypad +
   stuffing flow, since those are the pieces the native app got wrong first.
2. Fix the "Start fresh" tracking-start bug (§7) — one line.
3. Sort envelope lists by type (§7).
4. Optionally add `DEVELOPMENT_TEAM` to `project.yml`/`.pbxproj` once the user
   has added an Apple ID, so device builds work from the command line.

---

## 12. Web app (added 2026-09-16/17)

A React + TypeScript + Vite PWA under `web/`, deployed to GitHub Pages at
https://bharddwaj.github.io/budget/ by `.github/workflows/deploy-web.yml`.
Decisions: local-first IndexedDB via Dexie behind a `BudgetRepository`
interface designed for a later Firestore implementation; hash router; plain
CSS tokens transcribed from Palette/Theme; hand-rolled SVG charts; no PIN or
lock (user wants real email/password accounts, which belong to the Firebase
step). Screens, strings and behaviours mirror the iOS app; two deliberate
improvements over iOS: envelope lists are always ordered by type, and "Start
fresh" restarts spend-free tracking today instead of clearing it.

Environment gotchas on this Mac: Homebrew's node is broken (ICU) and the
Xcode license is unaccepted, so use `~/.local/node/bin` (Node 22.14) and
`/Library/Developer/CommandLineTools/usr/bin/git`. `.claude/launch.json`
already does this for the dev server.

Next: Firebase Auth (email/password) + Firestore sync — the user must create
the Firebase project; then implement `FirestoreRepository` per
`web/src/data/repository.ts`, a sign-in screen, and "sign in to sync".
