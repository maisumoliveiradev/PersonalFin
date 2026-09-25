# SDD-054 --- v0.9.0 Release Validation Report

-   **Date:** 2026-09-25
-   **Candidate:** `develop` at the merge of PR #69 (SDD-050 to SDD-053),
    validated from a fresh clone.
-   **Executed by:** AI agent (Claude Code) under the project owner's
    delegation, on the development machine (macOS, Node.js 24, Docker
    PostgreSQL 17).
-   **Verdict:** Released. No known critical integrity or security
    defect.

## Environment of the run

| Item | Value |
|---|---|
| Install | `npm ci` on a fresh clone of `develop` |
| Database | New empty database `personalfin_release`, dropped afterwards |
| API | `http://localhost:3334`, own `.env` and secret |
| Web | Expo Web on `http://localhost:8082` |
| Browser | Google Chrome (headless), versioned journeys; downloads and file choosers driven by Playwright |

## Results

| Check | Result | Evidence |
|---|---|---|
| Clean setup | Pass | `npm ci`; git hooks enabled by `prepare`. |
| Lint, typecheck, contract | Pass | `npm run validate` (452 files, contract up to date). |
| Unit tests | Pass | 516 (API) + 16 (client) + 223 (domain). |
| Integration tests | Pass | 127 against PostgreSQL; repeated with `TZ=Pacific/Kiritimati`; domain tests repeated with `TZ=Pacific/Pago_Pago`. |
| Migrations from clean database | Pass | `0001` to `0026` applied; second run applied nothing. |
| Import (SDD-050) | Pass | Browser: file chosen, header suggestions, errors per row, duplicates of an existing transaction and of another row decided explicitly, confirm, undo. Unit: Latin-1 CSV, fallback category, empty or unreadable files. Integration: original file and SHA-256 kept, bulk evaluation, link to transactions, undo. Domain: no rounding and explicit date order. |
| Exports (SDD-051) | Pass | Browser: CSV content with exact amounts, and the XLSX file. Unit: the XLSX export is read back exactly by the importer; CSV quoting. |
| PDF report (SDD-052) | Pass | Browser: PDF download. Unit: multi-page output. A sample was rendered and checked visually (pt-BR accents, metrics equal to the dashboard). |
| Portable backup (SDD-053) | Pass | Browser: versioned JSON with the space data. Integration: every table exported, imported file bytes excluded, JSON round trip. Unit: other users' data excluded. |
| v0.1.0 to v0.8.0 journeys (regression) | Pass | 38 earlier journeys. |
| iOS startup | Not run | No iOS simulator in this run. |
| Android startup | Pass (startup only) | Expo Go (SDK 57) on the `Phone` emulator renders the sign-in screen from the release bundle, which includes the new document picker, file system, and sharing modules. |

Browser journeys against the clean instance: 41 journeys, 236/236 steps
passed, 0 failures.

## Open items (not blocking)

-   Native file picking and sharing were not exercised on devices, only
    bundled and started (TD-008).
-   Backup restore and saved import mapping presets are not available.
-   Owner decisions pending: push notifications and invitation email
    (TD-011).
-   Domain decisions awaiting owner review: DR-096, DR-097, and
    `docs/sdds/v0.9.0/README.md`, plus earlier releases' items.
