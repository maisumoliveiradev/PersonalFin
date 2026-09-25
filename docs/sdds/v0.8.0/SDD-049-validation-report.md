# SDD-049 --- v0.8.0 Release Validation Report

-   **Date:** 2026-09-25
-   **Candidate:** `develop` at the merge of PR #63 (SDD-045 to SDD-048),
    validated from a fresh clone.
-   **Executed by:** AI agent (Claude Code) under the project owner's
    delegation, on the development machine (macOS, Node.js 24, Docker
    PostgreSQL 17).
-   **Verdict:** Released. No known critical integrity or security
    defect. Push notifications were not delivered; they need an owner
    decision (see open items).

## Environment of the run

| Item | Value |
|---|---|
| Install | `npm ci` on a fresh clone of `develop` |
| Database | New empty database `personalfin_release`, dropped afterwards |
| API | `http://localhost:3334`, own `.env` and secret |
| Web | Expo Web on `http://localhost:8082` |
| Browser | Google Chrome (headless), versioned journeys (`npm run test:e2e`, ADR-0013) |

## Results

| Check | Result | Evidence |
|---|---|---|
| Clean setup | Pass | `npm ci`; git hooks enabled by `prepare`. |
| Lint, typecheck, contract | Pass | `npm run validate` (413 files, contract up to date). |
| Unit tests | Pass | 472 (API, permission matrix extended to debts, goals, reminders) + 16 (client) + 216 (domain). |
| Integration tests | Pass | 125 against PostgreSQL; repeated with `TZ=Pacific/Kiritimati`; domain tests repeated with `TZ=Pacific/Pago_Pago`. |
| Migrations from clean database | Pass | `0001` to `0025` applied; second run applied nothing. |
| Debts (SDD-045) | Pass | Browser: plan with the last installment absorbing cents, payment, overpayment refused, payment removal. Integration: exact amounts at the maximum and an audited lifecycle. |
| Amortization simulation (SDD-046) | Pass | Browser: both modes compared, simulating changes nothing, confirming applies exactly the simulated plan. Integration: atomic confirmation and version conflict. |
| Goals (SDD-047) | Pass | Browser: space goal progress, history, reached state, dashboard unchanged, separate global goals. Integration: owner isolation and append-only history. |
| In-app reminders (SDD-048) | Pass | Browser: default offsets, dismissal, 7-day offset, reminder removed after payment. Unit: stages, personal settings, debt and negative-projection reminders. |
| v0.1.0 to v0.7.0 journeys (regression) | Pass | 34 earlier journeys. |
| iOS startup | Not run | No iOS simulator in this run; no native module was added in v0.8.0. |
| Android startup | Pass (startup only) | Expo Go (SDK 57) on the `Phone` emulator renders the sign-in screen from the release bundle. |

Browser journeys against the clean instance: 38 journeys, 227/227 steps
passed, 0 failures.

## Open items (not blocking)

-   **Push notifications (v0.8.0 roadmap item) need an owner decision.**
    They require Expo's hosted push service with FCM and APNs. Reminders
    are in-app only.
-   **Invitation email (TD-011)** still needs an owner decision.
-   Native platforms were only checked at startup (TD-008).
-   Domain decisions taken under delegation and awaiting owner review:
    DR-092 to DR-095 and `docs/sdds/v0.8.0/README.md`, plus earlier
    releases' items.
-   Known technical debt: TD-001 to TD-012.
