# SDD-058 --- v0.11.0 Release Validation Report

-   **Date:** 2026-09-25
-   **Candidate:** `develop` at the merge of PR #75 (SDD-057), validated
    from a fresh clone.
-   **Executed by:** AI agent (Claude Code) under the project owner's
    delegation, on the development machine (macOS, Node.js 24, Docker
    PostgreSQL 17).
-   **Verdict:** Released. No known critical integrity or security
    defect. OCR/AI extraction needs an owner decision.

## Results

| Check | Result | Evidence |
|---|---|---|
| Clean setup | Pass | `npm ci` on a fresh clone; git hooks enabled. |
| Lint, typecheck, contract | Pass | `npm run validate` (476 files, contract up to date). |
| Unit tests | Pass | 542 (API, permission matrix extended to attachments) + 16 (client) + 227 (domain). |
| Integration tests | Pass | 129 against PostgreSQL; repeated with `TZ=Pacific/Kiritimati`; domain tests repeated with `TZ=Pacific/Pago_Pago`. |
| Migrations from clean database | Pass | `0001` to `0028` applied; second run applied nothing. |
| Attachments (SDD-057) | Pass | Browser: image attached, HTML disguised as PDF refused, the file opens, marker on the list row, removal. Unit: magic-byte detection, limit of 10, audit, `nosniff`. Integration: bytes stored exactly, active count, soft delete. |
| v0.1.0 to v0.10.0 journeys (regression) | Pass | 42 earlier journeys. |
| iOS startup | Not run | No iOS simulator in this run. |
| Android startup | Pass (startup only) | Expo Go (SDK 57) renders the sign-in screen from the release bundle, which includes `expo-image-picker`. The camera itself was not exercised (TD-008). |

Browser journeys against the clean instance: 43 journeys, 246/246 steps
passed, 0 failures.

## Open items (not blocking)

-   **OCR/AI extraction and its review flow (FR-075 to FR-077)** need the
    owner to choose a provider.
-   Attachments are stored in the database (TD-014).
-   Owner decisions pending: push notifications, automatic exchange
    rates, and invitation email (TD-011).
-   Decisions awaiting owner review: DR-099 and
    `docs/sdds/v0.11.0/README.md`.
