# SDD-044 --- v0.7.0 Release Validation Report

-   **Date:** 2026-09-25
-   **Candidate:** `develop` at the merge of PR #57 (SDD-040 to SDD-043),
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
| Database | New empty database `personalfin_release`, dropped afterwards |
| API | `http://localhost:3334`, own `.env` and secret |
| Web | Expo Web on `http://localhost:8082` |
| Browser | Google Chrome (headless), driven by the versioned journeys (`npm run test:e2e`, ADR-0013). Offline is simulated by cutting the browser context's network or aborting API requests. |

## Results

| Check | Result | Evidence |
|---|---|---|
| Clean setup | Pass | `npm ci`; git hooks enabled by `prepare`. |
| Lint, typecheck, contract | Pass | `npm run validate` (362 files, contract up to date). |
| Unit tests | Pass | 415 (API) + 16 (client, new) + 200 (domain). |
| Integration tests | Pass | 119 against PostgreSQL; repeated with `TZ=Pacific/Kiritimati`; domain tests repeated with `TZ=Pacific/Pago_Pago`. |
| Migrations from clean database | Pass | `0001` to `0022` applied; second run applied nothing. |
| Minimum client version (SDD-040) | Pass | Unit: 426 for older, missing, or invalid versions only when a minimum is set; health and auth exempt. Browser: every call sends the version; the update screen appears on 426 and retry restores the app. |
| Offline reading (SDD-041) | Pass | Browser: data persisted per user, visible with the offline banner after a network cut and after a restart with the API unreachable; banner clears on reconnect; cache removed at sign-out. Unit: local schema migrations, newer schemas ignored, cache expiry. |
| Offline transaction changes (SDD-042) | Pass | Browser: offline create, status change, edit, delete, explicit discard, and sign-out warning; everything sent on reconnect; a create whose response was lost is replayed without a duplicate. Unit and integration: idempotent client-id creation, `409 TRANSACTION_ID_CONFLICT` on reuse. |
| Sync conflicts (SDD-043) | Pass | Browser (two devices, one account): automatic merge of independent fields, per-field choice, restore-and-apply after a remote delete, keep after a remote edit; the audit history shows each resolution. Unit and integration: reconciliation rules, audit `context` stored and returned; outbox schema v1 migrates to v2. |
| v0.1.0 to v0.6.0 journeys (regression) | Pass | 30 earlier journeys. |
| iOS startup | Not run | No iOS simulator in this run. The new native modules (AsyncStorage, expo-crypto) ship in Expo Go SDK 57 for both platforms. |
| Android startup | Pass (startup only) | Expo Go (SDK 57) on the `Phone` emulator bundles the release (including AsyncStorage, expo-crypto, expo-network) and renders the sign-in screen, with no Metro errors. |

Browser journeys against the clean instance: 34 journeys, 208/208 steps
passed, 0 failures.

## Open items (not blocking)

-   Offline behavior is verified in the browser. Native platforms were
    only checked at startup, because tap-driven emulator automation is
    not authorized (TD-008). Native offline behavior uses the same client
    code with native storage and connectivity modules.
-   The Web app cannot be opened without a connection (no service
    worker). It keeps working through connection drops while open.
-   Local offline data is not encrypted by the app (TD-012).
-   **Invitation email (TD-011)** still needs an owner decision.
-   Domain decisions taken under delegation and awaiting owner review:
    DR-088 to DR-091, ADR-0016, and `docs/sdds/v0.7.0/README.md`, plus
    earlier releases' items.
-   Known technical debt: TD-001 to TD-012.
