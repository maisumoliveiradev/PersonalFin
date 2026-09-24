# SDD-016 --- v0.2.0 Release Validation Report

-   **Date:** 2026-09-24
-   **Candidate:** `develop` at the merge of PR #19 (SDD-008 to SDD-015),
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
| Browser | Google Chrome (headless) driven by Playwright from outside the repository, timezone `America/Sao_Paulo` |

## Results

| Check | Result | Evidence |
|---|---|---|
| Clean setup | Pass | `npm ci`; git hooks enabled by `prepare`. |
| Lint, typecheck, contract | Pass | `npm run validate` (171 files, 4 workspaces, contract up to date). |
| Unit tests | Pass | 155 (API) + 117 (domain). |
| Integration tests | Pass | 62 against PostgreSQL; repeated with `TZ=Pacific/Kiritimati`; domain tests repeated with `TZ=Pacific/Pago_Pago`. |
| Migrations from clean database | Pass | `0001` to `0010` applied; second run applied nothing. |
| Transaction edit and audit (SDD-008) | Pass | Browser: prefilled edit, type change, stale edit rejected in a second tab. |
| Soft delete and restore (SDD-009) | Pass | Browser: confirmation, trash, restore with identical values. |
| Quick status change (SDD-010) | Pass | Browser: paid/received/pending toggles, stale toggle refreshes. |
| Category management (SDD-011) | Pass | Browser: create, subcategory, rename, archive rules, used/unused deletion. |
| Filters and search (SDD-012) | Pass | Browser: month navigation, each filter, accent-insensitive search, 54-row pagination. |
| Balance snapshots (SDD-013) | Pass | Browser: record positive/negative balances, history, not a transaction. |
| Balance prompt (SDD-014) | Pass | Browser: due rules for default, 30-day, and daily settings; "Depois". |
| Dashboard (SDD-015) | Pass | Browser: metrics checked to the cent; deleted and pending handled; month-end balance. Integration: exact values for every metric. |
| v0.1.0 journeys (regression) | Pass | Auth, spaces, categories, transaction entry, list. |
| User/space isolation | Pass | Browser and API tests: other users receive 404 for spaces, transactions, categories, balance, reminder, and dashboard. |
| iOS startup | Not re-run | Verified for v0.1.0; no native module was added in v0.2.0. |
| Android startup | Pass (startup only) | Expo Go (SDK 57) on the `Phone` emulator renders the sign-in screen. |

Browser journeys against the clean instance: 13 journeys, 97/97 steps passed, 0 failures.

## Open items (not blocking)

-   Full journeys are automated on the Web only; native platforms were
    checked for startup (TD-008).
-   Domain decisions taken under delegation and awaiting owner review:
    DR-073 (archived categories) and DR-074 (balance reminder rule), and
    the decisions listed in `docs/sdds/v0.2.0/README.md`.
-   Known technical debt: TD-001 to TD-009.
