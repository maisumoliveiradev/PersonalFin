# SDD-033 --- v0.5.0 Release Validation Report

-   **Date:** 2026-09-25
-   **Candidate:** `develop` at the merge of PR #43 (SDD-029 to SDD-032),
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
| Lint, typecheck, contract | Pass | `npm run validate` (300 files, contract up to date). |
| Unit tests | Pass | 257 (API) + 189 (domain). |
| Integration tests | Pass | 107 against PostgreSQL; repeated with `TZ=Pacific/Kiritimati`; domain tests repeated with `TZ=Pacific/Pago_Pago`. |
| Migrations from clean database | Pass | `0001` to `0018` applied; second run applied nothing. |
| Tags (SDD-029) | Pass | Browser: create, unique names, multiple tags per transaction, filter, edit, archive, delete rules. |
| Evolution and comparisons (SDD-030) | Pass | Browser: comparison with previous month and year, null percentage on zero base, 12-month evolution. Integration: values equal the dashboard to the cent. |
| Category and tag analytics (SDD-031) | Pass | Browser: category and tag shares, previous period, 3-month range. Integration: categories add up to the realized total. |
| Dashboard personalization (SDD-032) | Pass | Browser: default Advanced, Basic profile, section override, space screen follows preferences. |
| v0.1.0 to v0.4.0 journeys (regression) | Pass | 22 earlier journeys. |
| User/space isolation | Pass | API tests: other users receive 404 for tags, analytics, and preferences. |
| iOS startup | Not re-run | No native module was added in v0.5.0. |
| Android startup | Pass (startup only) | Expo Go (SDK 57) on the `Phone` emulator renders the sign-in screen against the release instance. |

Browser journeys against the clean instance: 26 journeys, 168/168 steps
passed, 0 failures.

## Open items (not blocking)

-   Full journeys are automated on the Web only; native platforms were
    checked for startup (TD-008).
-   Domain decisions taken under delegation and awaiting owner review:
    DR-083 and DR-084 and `docs/sdds/v0.5.0/README.md`, plus earlier
    releases' items.
-   Known technical debt: TD-001 to TD-010.
