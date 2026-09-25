# SDD-039 --- v0.6.0 Release Validation Report

-   **Date:** 2026-09-25
-   **Candidate:** `develop` at the merge of PR #51 (SDD-034 to SDD-038),
    validated from a fresh clone.
-   **Executed by:** AI agent (Claude Code) under the project owner's
    delegation, on the development machine (macOS, Node.js 24, Docker
    PostgreSQL 17).
-   **Verdict:** Released. No known critical integrity or security
    defect. Open items are listed at the end, including invitation email
    delivery (TD-011), which needs an owner decision.

## Environment of the run

| Item | Value |
|---|---|
| Install | `npm ci` on a fresh clone of `develop` |
| Database | New empty database `personalfin_release` |
| API | `http://localhost:3334`, own `.env` and secret |
| Web | Expo Web on `http://localhost:8082` |
| Browser | Google Chrome (headless), separate browser contexts per user, driven by the versioned journeys (`npm run test:e2e`, ADR-0013) |

## Results

| Check | Result | Evidence |
|---|---|---|
| Clean setup | Pass | `npm ci`; git hooks enabled by `prepare`. |
| Lint, typecheck, contract | Pass | `npm run validate` (330 files, contract up to date). |
| Unit tests | Pass | 402 (API, including a permission matrix over every space endpoint) + 191 (domain). |
| Integration tests | Pass | 116 against PostgreSQL; repeated with `TZ=Pacific/Kiritimati`; domain tests repeated with `TZ=Pacific/Pago_Pago`. |
| Migrations from clean database | Pass | `0001` to `0021` applied; second run applied nothing. |
| Membership and permissions (SDD-034) | Pass | Unit: 403 for members without permission and 404 for non-members on every endpoint. Browser: viewer cannot record. |
| Invitations (SDD-035) | Pass | Browser (two users): link created once, preview, accept, reuse refused, other email refused, duplicate access refused. Integration: only the token hash is stored; expired and cancelled links grant nothing. |
| Member management (SDD-036) | Pass | Browser: custom permissions take effect, removal revokes access immediately, member leaves; records stay. |
| Ownership transfer (SDD-037) | Pass | Browser: Owner cannot leave before transferring; transfer; new Owner has full access; previous Owner leaves. Integration: exactly one Owner. |
| Audit history (SDD-038) | Pass | Browser: newest-first history with actor and field changes. Integration: paging returns every event once. |
| v0.1.0 to v0.5.0 journeys (regression) | Pass | 26 earlier journeys. |
| iOS startup | Not re-run | No native module was added in v0.6.0. |
| Android startup | Pass (startup only) | Expo Go (SDK 57) on the `Phone` emulator renders the sign-in screen against the release instance. |

Browser journeys against the clean instance: 30 journeys, 186/186 steps
passed, 0 failures.

## Open items (not blocking)

-   **Invitation email (TD-011):** links are shared by the inviter;
    sending email needs the owner to choose a provider.
-   Full journeys are automated on the Web only; native platforms were
    checked for startup (TD-008).
-   Domain decisions taken under delegation and awaiting owner review:
    DR-085 to DR-087, ADR-0015, and `docs/sdds/v0.6.0/README.md`, plus
    earlier releases' items.
-   Known technical debt: TD-001 to TD-011.
