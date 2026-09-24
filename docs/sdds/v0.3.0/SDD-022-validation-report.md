# SDD-022 --- v0.3.0 Release Validation Report

-   **Date:** 2026-09-24
-   **Candidate:** `develop` at the merge of PR #28 (SDD-017 to SDD-021),
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
| Lint, typecheck, contract | Pass | `npm run validate` (215 files, contract up to date). |
| Unit tests | Pass | 184 (API) + 146 (domain). |
| Integration tests | Pass | 78 against PostgreSQL; repeated with `TZ=Pacific/Kiritimati`; domain tests repeated with `TZ=Pacific/Pago_Pago`. |
| Migrations from clean database | Pass | `0001` to `0012` applied; second run applied nothing. |
| Business-day calendar (SDD-017) | Pass | Domain tests: national holidays including Good Friday, previous/next business day. |
| Recurring series (SDD-018) | Pass | Browser: monthly series, forecast occurrences, weekend adjustment, paying one occurrence, extension beyond the horizon, series screen. |
| Occurrence independence (SDD-019) | Pass | Browser: "Apenas este", "Este e os próximos", "Encerrar"; paid and individually edited occurrences kept. |
| Future commitments (SDD-020) | Pass | Browser: overdue and 7/30/90-day windows, exact totals, quick "Marcar como pago". |
| Monthly projection (SDD-021) | Pass | Browser: projection components and six-month series; no projection without observed balance. Integration: exact M-008 values. |
| v0.1.0 and v0.2.0 journeys (regression) | Pass | Auth, spaces, categories, entry, list, edit, trash, status, category management, filters, balance, reminder, dashboard. |
| User/space isolation | Pass | API tests: other users receive 404 for recurrences, commitments, and projection (projection route test added during this validation), as for earlier resources. |
| iOS startup | Not re-run | Verified for v0.1.0; no native module was added in v0.3.0. |
| Android startup | Pass (startup only) | Expo Go (SDK 57) on the `Phone` emulator renders the sign-in screen against the release instance. |

Browser journeys against the clean instance: 17 journeys, 114/114 steps
passed, 0 failures.

## Open items (not blocking)

-   Full journeys are automated on the Web only; native platforms were
    checked for startup (TD-008).
-   Domain decisions taken under delegation and awaiting owner review:
    DR-075 to DR-077 and the decisions listed in
    `docs/sdds/v0.3.0/README.md`, plus the pending v0.2.0 items.
-   Known technical debt: TD-001 to TD-009.
