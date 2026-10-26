# Codebase cleanup: umbrella design

**Date:** 2026-10-26 · **Status:** draft for review

This is the umbrella spec for restructuring the AutonomIA frontend. It sets the
goals, the target structure, the slices, their order and how each one is done
and verified. Each slice gets its own step-by-step implementation plan when
work on it starts. Slices 5 and 6 also get a short design spec of their own
first.

## 1. Why

The app was built in Google AI Studio and works, but its code is concentrated
and duplicated in ways that already cause bugs:

- Four files hold about 60% of the ~11,700 lines in `src/`:
  `AdminDashboard.tsx` (2,710), `App.tsx` (1,777), `Step2HouseholdFinance.tsx`
  (1,652) and `OnBehalfLoanManager.tsx` (893).
- The installment formula exists in six places, the product lookup by name in
  six, the loan-number logic in three, the business-profit calculation in
  three, and status labels in at least five. The copies have drifted (see
  appendix A).
- There are two separate application forms (applicant and on-behalf), with
  different save logic, different starting data and different validation.
- Four screens subscribe to `config/settings` independently, and two subscribe
  to the full `applications` and `scoring_evaluations` collections.
- Apart from the Firestore rules tests, there are no automated tests and no CI.

The rest of the codebase is reasonable and is kept as is: `types.ts`, the
Cloudinary upload helper, the `lib/server` + `api/` backend shape, and the
Firestore rules with their emulator tests.

## 2. Goals and non-goals

**Goals**

- The app behaves the same for users, except for the bugs this plan
  deliberately fixes (section 5, slices marked B).
- Each file has one job and a size that fits in a reader's head.
- Each business rule (money maths, validation, labels) lives in exactly one
  place.
- Unit tests cover the money logic. Component tests cover the riskiest screens.
  CI runs everything on every PR.

**Non-goals**

- No visual redesign and no new features.
- No change to status-label wording or to the on-behalf form's validation
  rules. Both wait on MUJERES 2000 (section 7). The code keeps today's
  behaviour for them, centralised in one place.
- No change to the shape of data stored in Firestore, except where a fix needs
  it: a product id on applications (slice 1d) and a counter document for loan
  numbers (slice 6).
- No router library. Screens keep switching through state, as today.
- No fixes to issues outside this list. Anything found along the way is filed
  as a GitHub issue.

## 3. Target structure

```
src/
  domain/          pure logic: no React, no Firebase, fully unit-tested
    loan.ts          product lookup, rate normalisation, installment, payment schedule
    profit.ts        weekly/monthly business profit
    household.ts     household income/expense totals
    validation.ts    form rules, one module; each form passes its own rule set
    status.ts        status labels and colours, today's wording per audience
    format.ts        money and date formatting
  data/            all Firestore access
    settings         one shared live subscription, exposed through React context
    applications     hooks for applicant and admin lists; write actions
    loanNumber       loan-number counter (slice 6)
  features/
    auth/            login screen, role resolution
    applicant/       loan list, loan detail, payments
    wizard/          the single application form, used by applicants and on-behalf staff
    admin/           applications table, detail sections, collections tab, dialogs
    settings/  scoring/  users/
  App.tsx          sign-in gate and screen selection, about 150 lines
```

- `domain/` must not import React or Firebase. That keeps it testable in plain
  Node and makes it the single place for business rules.
- `data/` is the only layer that imports `firebase/firestore`. Components call
  hooks and actions from it.
- `components/ui/` stays at the repository root, where `components.json` and
  the `@/` alias expect it. The unused duplicate `src/components/ui/textarea.tsx`
  is deleted.
- File moves happen inside the slice that touches that area, not in a separate
  "move everything" PR.

## 4. Testing

- **Unit tests** (Vitest, Node) for everything in `domain/`.
- **Component tests** (Vitest, jsdom, React Testing Library) for the Step 2
  rows, form navigation, save and reload (the BUG-01 scenario), and admin
  approve, reject and disburse. Firebase is mocked at the `data/` boundary, so
  component tests don't need the emulator.
- **Rules tests** (existing, Firebase emulator) stay. Slice 6 adds to them.
- **CI** (GitHub Actions) on every PR runs type-check, build, unit and
  component tests, and rules tests against the emulator.
- **Behaviour first.** Before logic is moved, tests record what it does today.
  The code is then moved and those tests must still pass. For refactor PRs this
  is the evidence that behaviour did not change.

## 5. Slices

**R** = pure refactor, where behaviour must stay identical. **B** = intended
behaviour change. A B change always gets its own PR, separate from any R work,
and states the change in plain words at the top of the description.

### Slice 0: Test tooling and CI (R)

- Split the test setup: `test:unit` (Vitest, jsdom + React Testing Library, no
  emulator) and `test:rules` (the current emulator command). `npm test` runs
  both.
- Add a GitHub Actions workflow: `npm ci`, `npm run lint`, `npm run build`,
  `test:unit`, `test:rules` (needs Java for the emulator).
- Turn on `strict` in `tsconfig.json` and fix the 11 resulting errors.
- Closes #26 (INF-02).

### Slice 1a: Shared domain logic (R)

- Write behaviour-recording tests for the current formula, then move into
  `domain/loan.ts`:
  - product lookup by name
  - rate normalisation, including the legacy `rate <= 2 → × 1200` conversion
  - weekly rate = monthly ÷ 4
  - installment amount
  - payment-schedule generation
- Replace all six copies: `App.tsx`, `AdminDashboard.tsx`, `LoanSimulator.tsx`,
  `Step4LoanDetails.tsx`, `generateMutuoPdf.ts`, and the rate display in
  `SettingsManager.tsx`.
- Move the profit calculation (`Step3Entrepreneurship.tsx` ×2,
  `AdminDashboard.tsx`) into `domain/profit.ts`, unchanged, bug included.
- Move household totals into `domain/household.ts`.
- Move validation into `domain/validation.ts`, keeping two rule sets: the
  applicant form's current rules and the on-behalf form's current rules (name,
  last name, DNI). The duplicate `isStepNValid` / `getApplicationValidationErrors`
  pair in `App.tsx` becomes one.
- Move status labels and colours into `domain/status.ts`, keeping each screen's
  current wording.
- Move money and date formatting into `domain/format.ts`.

### Slice 1b: 0% rate and maximum-amount fallback (B)

- A 0% rate gives `amount / installments` everywhere, matching what the
  contract PDF already does, instead of dividing by zero.
- The maximum-amount fallback uses `MAX_LOAN_AMOUNT` everywhere, replacing the
  hard-coded `700000`. The value is the same, so users see no difference.

### Slice 1c: Weekly/monthly profit (B)

- Fixed costs are entered as monthly and travel expenses as weekly (see the
  Step 3 labels). Correct formulas:
  - monthly profit = 4 × (weekly product profit − weekly travel) − monthly fixed costs
  - weekly profit = monthly profit ÷ 4
- Keep the existing month = 4 weeks convention.
- Out of scope: whether sales are counted twice between Step 2 and Step 3
  (#40). That is parked for the NGO.
- Existing applications store `netWeeklyProfit` / `netMonthlyProfit`. They are
  not recalculated in the database. The admin view recalculates from the inputs,
  as it does today.

### Slice 1d: Product id and no silent 48% fallback (B)

- Store `loanDetails.productId` alongside `creditType`. Look the product up by
  id, falling back to name for existing records.
- When no product matches, show an explicit error when disbursing, generating
  the contract, or in the form and simulator, instead of silently using 48%.
- Remove the hard-coded `"Línea Inicial"` default from the on-behalf form. It
  takes its product from settings, like the applicant form.
- Not in this PR: correcting the two existing `"Línea Inicial"` loans (one
  active, one approved and not yet disbursed). That is a data decision for the
  NGO (see #44).
- Closes #44 (code part).

### Slice 2: Step 2 driven by a list of rows (R)

- Replace the ~26 hand-copied income and expense rows with a row definition
  list and a single `IncomeRow` / `ExpenseRow` component.
- A component test records the exact object passed to `onChange` for every
  row before the change, and must produce the same object after it. Existing
  drafts depend on that shape.
- The derived totals (`fixedIncome`, `variableIncome`, `expenseFoodRent`,
  `expenseServices`, `debtInstallments`) come from `domain/household.ts`.

### Slice 3: Split the admin panel (R)

- `features/admin/` gets:
  - `ApplicationsTable`
  - `ApplicationDetail`, made of per-step sections that share one `Field`
    display component
  - `CollectionsTab`
  - a single `ConfirmDialog`
- Admin write actions (status change, disburse, validate payment, upload
  proof, delete, save comment) move to `data/applications`.
- Delete the unused `renumberAllApplications`.
- The background effect that assigns missing loan numbers stays until slice 6.
- The "Limpiar Demo" label stays (decision pending in #37).
- Component tests:
  - approval is blocked without a passing scoring
  - the creator of an on-behalf application cannot approve or disburse it
  - disbursing builds the expected schedule

### Slice 4: Shared data sources (R + B)

- One `config/settings` subscription in a `SettingsProvider`, using today's
  `App.tsx` merge with `DEFAULT_SETTINGS`. It replaces the separate listeners
  in `App.tsx`, `AdminDashboard.tsx` and `ScoringManager.tsx`, and the one-off
  read in `SettingsManager.tsx`.
- One admin data source for `applications` and `scoring_evaluations`, shared
  by the admin panel and scoring.
- Remove the email-based queries that the rules reject: `users` by email in
  `App.tsx`, and `applications` by `userEmail` in `App.tsx`. Both are documented
  in #7.
- **B side effect:** scoring gets the default settings like every other
  screen, so it no longer hangs when the settings document is missing. This
  goes in its own PR and closes #13 (BUG-04).

### Slice 5: One application form, and BUG-01 (R + B). Gets its own design spec

- One `wizard/` form and one draft hook (load, prefill from the last loan,
  autosave, submit), used by both applicants and on-behalf staff. Mode-specific
  differences are explicit options:
  - who owns the draft
  - the starting data
  - which validation rule set applies
  - what happens on submit
- Keeps the existing protection against snapshots overwriting the local step
  (`hasInitializedStep`, see #11), and proves it with a component test of the
  #11 scenario: fill to step 3, reload, nothing lost, navigation still works.
- Split `App.tsx` into `features/auth`, `features/applicant` (loan list, loan
  detail) and the shared wizard.
- Its own spec decides the single save strategy (debounced autosave vs. the
  on-behalf form's save-on-step) and how prefill works.
- Closes #11 once the test passes and a manual check confirms it.

### Slice 6: Loan-number counter (B). Gets its own spec, written as emulator rules tests

- Replace the three client-side calculations (`App.tsx` submit,
  `OnBehalfLoanManager.tsx` submit, `AdminDashboard.tsx` background effect)
  with one counter that two submissions can't both claim.
- The spec chooses where it runs: a Firestore transaction on a counter
  document with a rule that only allows +1, or a `lib/server` function using
  the Admin SDK. Either way, Cloud Functions and the Blaze plan are not
  required.
- Existing loan numbers are permanent and are never renumbered.
- Closes #12 (BUG-03).

### Housekeeping (H): small PRs in between slices

Mostly R, low risk:

- unused imports and dead code (`handleGuestLogin`, `hasActiveApplication`,
  `activeApp`, the unused JPG logo, `metadata.json`)
- remove guest mode (#32)
- one lockfile: keep `package-lock.json`, delete `bun.lock`
- package name, instead of `react-example`
- AI Studio leftovers in `vite.config.ts` (the `DISABLE_HMR` comment)
- stale parts of `README.md`, `DOCUMENTACION_TECNICA.md` and `CLAUDE.md`
  (tests now exist, `firebase.json` now declares the Firestore rules, Firebase
  Storage is not used)
- compress the logo and split the bundle by screen (#24)

Needs care:

- Remove `experimentalForceLongPolling`. This changes how the app connects to
  Firestore, so check it by hand on a phone, including iOS Safari.
- Run `npm audit fix` (#27). Major-version upgrades get their own PR.

## 6. Order and dependencies

```
0 → 1a → 1b, 1c, 1d → 2 ┐
                     3 ┴→ 4 → 5 → 6
H: any time, in small PRs
```

- 1b, 1c and 1d depend on 1a and are independent of each other.
- 2 and 3 are independent of each other and can run in parallel.
- 4 needs 3, because the admin data source replaces the panel's listeners.
- 5 needs 4, because the form reads settings from the provider.
- 6 comes last, so the counter is wired into the single form and the split
  admin panel instead of three old copies.

## 7. Parked for MUJERES 2000

These are not decided by this plan. The code keeps today's behaviour, in one
place, so each answer becomes a one-place change:

- Validation for on-behalf applications: should staff be able to submit
  incomplete applications?
- Status wording per audience ("Rechazado" vs "No Aprobado", "Activo" vs
  "Vigente", "Pagado" vs "Cancelado (Pagado)").
- Weekly rate = monthly ÷ 4, and month = 4 weeks.
- Sales possibly counted twice between Step 2 and Step 3 (#40).
- What to do with the two existing `"Línea Inicial"` loans (#44).
- Rename or keep "Limpiar Demo" (#37).

## 8. Working agreements for every slice

- One branch and one PR per slice (or per R/B part), to `emprende-droid/AutonomIA`.
- Every PR description has a short manual check list for the screens it
  touches.
- Data fixes are never part of a code PR. They are scripts run separately,
  after a fresh backup and an explicit go-ahead.
- Rules changes are deployed manually as a separate step after merge.
- The other Claude session no longer works on the areas this plan owns:
  profit, loan numbers and the application form (BUG-01).
- At the end of each slice, update `CLAUDE.md` wherever it's out of date.

## Appendix A: Duplication found on 2026-10-26

| Logic | Copies | Drift |
|---|---|---|
| Installment formula | 6: `App.tsx`, `AdminDashboard.tsx`, `LoanSimulator.tsx`, `Step4LoanDetails.tsx`, `generateMutuoPdf.ts`, `SettingsManager.tsx` (rate display) | Only the PDF handles a 0% rate |
| Product lookup by name, falling back to 48% | 6, same files | Same silent fallback everywhere (#44) |
| Maximum-amount fallback | 3 | `MAX_LOAN_AMOUNT` vs hard-coded `700000` |
| Loan number | 3: `App.tsx`, `OnBehalfLoanManager.tsx`, `AdminDashboard.tsx` | Three different algorithms |
| Business profit | 3: `Step3Entrepreneurship.tsx` ×2, `AdminDashboard.tsx` | Identical, all subtract monthly costs from weekly profit |
| Validation | 3: `App.tsx` ×2, `OnBehalfLoanManager.tsx` | On-behalf checks only name and DNI |
| Status labels | 5 or more | Different wording per screen |
| Settings loading | 4: three live listeners, one one-off read | `ScoringManager` has no defaults (#13) |
| Application form | 2: `App.tsx`, `OnBehalfLoanManager.tsx` | Different save logic and starting data |
