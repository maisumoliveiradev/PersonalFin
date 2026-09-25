# SDD-061 --- v0.12.0 Release Validation Report

-   **Date:** 2026-09-25
-   **Candidate:** `develop` at the merge of PR #79 (SDD-059 and
    SDD-060), validated from a fresh clone.
-   **Executed by:** AI agent (Claude Code) under the project owner's
    delegation, on the development machine (macOS, Node.js 24, Docker
    PostgreSQL 17).
-   **Verdict:** Released. No known critical integrity or security
    defect.

## Results

| Check | Result | Evidence |
|---|---|---|
| Clean setup | Pass | `npm ci` on a fresh clone; git hooks enabled. |
| Lint, typecheck, contract | Pass | `npm run validate` (496 files, contract up to date). |
| Unit tests | Pass | 550 (API) + 16 (client) + 227 (domain). |
| Integration tests | Pass | 131 against PostgreSQL; repeated with `TZ=Pacific/Kiritimati`; domain tests repeated with `TZ=Pacific/Pago_Pago`. |
| Migrations from clean database | Pass | `0001` to `0030` applied; second run applied nothing. |
| Platform administration (SDD-059) | Pass | Browser: regular users see no administration area; the role is granted with the operator CLI; the overview shows counts and no money. Unit: 403 for non-administrators; an administrator gets 404 on spaces. Integration: aggregate overview without amount fields. |
| Support access (SDD-060) | Pass | Browser (two people): 404 without a grant; the Owner authorizes; the administrator reads the space with no write actions; the access appears in the audit history; revocation ends access. Unit: writes refused (403), including personal writes; expiry and loss of the role end access; Owner-only management. Integration: active-grant lookup, audited access, 7-day constraint. |
| v0.1.0 to v0.11.0 journeys (regression) | Pass | 43 earlier journeys. |
| iOS startup | Not run | No iOS simulator in this run. |
| Android startup | Pass (startup only) | Expo Go (SDK 57) renders the sign-in screen from the release bundle. |

Browser journeys against the clean instance: 45 journeys, 253/253 steps
passed, 0 failures.

## Open items (not blocking)

-   Crash and error reporting, performance monitoring, and client-version
    adoption need observability tooling that the owner has not chosen.
-   Owner decisions pending: push notifications, automatic exchange
    rates, OCR/AI extraction, and invitation email (TD-011).
-   Decisions awaiting owner review: ADR-0018, DR-100, DR-101, and
    `docs/sdds/v0.12.0/README.md`.
