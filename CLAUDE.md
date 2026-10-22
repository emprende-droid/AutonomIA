# AutonomIA — plataforma de microcréditos, MUJERES 2000

Loan-management platform for MUJERES 2000, an NGO giving microcredits to women
entrepreneurs in the northern Buenos Aires suburbs using the Grameen method
(relationship-based, not financial scoring). Applicants are identifiable people
in vulnerable situations: the data is sensitive (DNI, CUIL, address, income, CBU)
and privacy weighs more than usual.

## Source of truth

**This repository.** The app was originally built in Google AI Studio; that is
discarded and must not be used — it has no branches, no review, and its restore
points recover code but not the database.

Upstream is `emprende-droid/AutonomIA`. Work happens in forks and lands via PR.

## Stack

- **Frontend**: Vite 6 + React 19 + TypeScript, Tailwind v4. Builds to static files.
- **Data & auth**: Firebase (Auth + Firestore), called directly from the browser.
- **File uploads**: Cloudinary, not Firebase Storage.
- **Hosting**: Vercel. Serverless functions in `api/`.
- **Local dev**: `server.ts` runs Express + Vite middleware. Dev only; not deployed.

Backend handler logic lives in `lib/server/` and is shared by both entry points:
`server.ts` (Express, local) and `api/*.ts` (Vercel, production). Keep new
handlers in that shape — it is what makes the backend portable between hosts.

## Firebase projects

| | Project | State |
|---|---|---|
| **Production** | `prestamos-mujeres2000` ("AutonomIA by MUJERES2000") | Spark plan, **no billing account attached** |
| Legacy | `ai-studio-applet-webapp-959cd` ("Mis aplicaciones personales") | Holds pre-July-2026 pilot data. On Blaze via a third party's billing account. Access was revoked in Oct 2026. |

`firebase-applet-config.json` holds the production client config. It is committed
on purpose — Firebase client config is public by design, not a secret.

Deploying Cloud Functions would require upgrading production to Blaze, which
requires a billing account. That should be the organisation's, never an individual's.

## Known traps

Things that have already cost time and are not visible from reading the code:

- **`firebase.json` only declares storage rules.** `firebase deploy` does *not*
  deploy `firestore.rules`. There is no guarantee the rules in this repo are the
  ones running in production. Fix this before relying on any rules change.
- **`config/settings` is admin-write-only.** The loan-number counter write-back in
  `App.tsx` therefore fails silently for regular applicants, so two submissions can
  receive the same number.
- **Dates are plain ISO strings**, not Firestore `Timestamp` objects. Keep it that way.
- **Firebase Storage is not used and not enabled.** Uploads go to Cloudinary.
  `storage.rules` denies everything; if Storage is ever adopted, write real
  rules and tests before deploying.
- **A `gestor` role exists in production data** but no code path recognises it.
  Every role check is `=== 'admin'`.
- **Business rules live only in the frontend.** Firestore rules validate shape on
  create and ownership on update, and nothing else. The database currently accepts
  state transitions the UI would never offer.

## Commands

```
npm run dev      # tsx server.ts — Express + Vite on :3000
npm run build    # vite build
npm run lint     # tsc --noEmit — note: strict mode is OFF
```

There are no automated tests.

## Backups

`migrate-database.js` exports/imports the four collections (`users`,
`applications`, `scoring_evaluations`, `config`) using a service account key.

The Admin SDK cannot reach the legacy AI Studio database (returns `NOT_FOUND`);
that one is only reachable via the Firestore REST API with a user OAuth token.
Service account keys must never be committed.

## Audits and tracking

Two independent audits exist:

- **Lautaro R. Temperini**, 24 Jul 2026 — 24 findings with IDs (`SEC-01`, `BUG-03`, …)
- **Wingu**, Sept 2026 — architectural; its central finding duplicates `SEC-02`

Findings are tracked as GitHub issues keeping the original IDs in the title.
Both audits independently identified that an applicant can approve their own loan.

## Working agreements

- Firestore rules are the enforcement layer. Frontend validation is for UX only
  and must never be the only check.
- Spec first only where there is a real design decision: the rules rewrite and the
  approval workflow. For the rules, the spec is a Firebase emulator test suite,
  not prose. Everything else is fixed directly.
- Never commit service account keys or database backups — backups contain
  applicant PII and this repository is public.
