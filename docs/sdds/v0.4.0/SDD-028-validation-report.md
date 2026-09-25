# SDD-028 --- v0.4.0 Release Validation Report

-   **Date:** 2026-09-25
-   **Candidate:** `develop` at the merge of PR #36 (SDD-023 to SDD-027),
    validated from a fresh clone.
-   **Executed by:** AI agent (Claude Code) under the project owner's
    delegation, on the development machine (macOS, Node.js 24, Docker
    PostgreSQL 17).
-   **Verdict:** Released. No known critical integrity or security
    defect. Open items are listed at the end.

## Environment of the run

| Item | Value |
|---|---|
| Install | `npm ci` on a fresh clone of `develop` |
| Database | New empty database `personalfin_release` |
| API | `http://localhost:3334`, own `.env` and secret |
| Web | Expo Web on `http://localhost:8082` |
| Browser | Google Chrome (headless) driven by the versioned journeys (`npm run test:e2e`, ADR-0013) |

## Results

| Check | Result | Evidence |
|---|---|---|
| Clean setup | Pass | `npm ci`; git hooks enabled by `prepare`. |
| Lint, typecheck, contract | Pass | `npm run validate` (257 files, contract up to date). |
| Unit tests | Pass | 238 (API) + 174 (domain). |
| Integration tests | Pass | 99 against PostgreSQL; repeated with `TZ=Pacific/Kiritimati`; domain tests repeated with `TZ=Pacific/Pago_Pago`. |
| Migrations from clean database | Pass | `0001` to `0016` applied; second run applied nothing. |
| Cards and limits (SDD-023) | Pass | Browser: create, validation, unique name, future and current limits, append-only history, archive. |
| Card purchases and invoices (SDD-024) | Pass | Browser: suggested invoice by closing day, manual invoice, no status on card purchases, invoice screen, date overrides; metrics by invoice month. |
| Installments (SDD-025) | Pass | Browser: exact split with remainder on the first, one per invoice, cancel later installments. Integration: 10 installments add up to the total. |
| Invoice payment (SDD-026) | Pass | Browser: partial and full payments, over-payment rejected, payment never an expense, realized after payment, projection counts the invoice once, payment removal. |
| Card limit and summary (SDD-027) | Pass | Browser: used/available with future installments and payments, invoices by month. |
| v0.1.0 to v0.3.0 journeys (regression) | Pass | 17 earlier journeys. |
| User/space isolation | Pass | API tests: other users receive 404 for cards, invoices, payments, installments, and card limits. |
| iOS startup | Not re-run | No native module was added in v0.4.0. |
| Android startup | Pass (startup only) | Expo Go (SDK 57) on the `Phone` emulator renders the sign-in screen against the release instance. |

Browser journeys against the clean instance: 22 journeys, 148/148 steps
passed, 0 failures.

## Open items (not blocking)

-   Full journeys are automated on the Web only; native platforms were
    checked for startup (TD-008).
-   Domain decisions taken under delegation and awaiting owner review:
    DR-078 to DR-082 and `docs/sdds/v0.4.0/README.md`, plus earlier
    releases' items.
-   Known technical debt: TD-001 to TD-010.
