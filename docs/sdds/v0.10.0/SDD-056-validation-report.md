# SDD-056 --- v0.10.0 Release Validation Report

-   **Date:** 2026-09-25
-   **Candidate:** `develop` at the merge of PR #72 (SDD-055), validated
    from a fresh clone.
-   **Executed by:** AI agent (Claude Code) under the project owner's
    delegation, on the development machine (macOS, Node.js 24, Docker
    PostgreSQL 17).
-   **Verdict:** Released. No known critical integrity or security
    defect. Automatic rates need an owner decision.

## Results

| Check | Result | Evidence |
|---|---|---|
| Clean setup | Pass | `npm ci` on a fresh clone; git hooks enabled. |
| Lint, typecheck, contract | Pass | `npm run validate` (464 files, contract up to date). |
| Unit tests | Pass | 528 (API) + 16 (client) + 227 (domain, including exact conversion at rounding boundaries and 0-decimal currencies). |
| Integration tests | Pass | 128 against PostgreSQL; repeated with `TZ=Pacific/Kiritimati`; domain tests repeated with `TZ=Pacific/Pago_Pago`. |
| Migrations from clean database | Pass | `0001` to `0027` applied; second run applied nothing. |
| Foreign-currency transactions (SDD-055) | Pass | Browser: rate recorded; a dollar expense converted with the latest rate and shown with its original; conversion preview; edit of the original amount; a missing rate refused. Unit: the applied rate is preserved after new rates; editing the base amount alone is refused; explicit conversion to base; audit of the original fields. Integration: numeric rate precision, append-only rates, the consistency check. |
| v0.1.0 to v0.9.0 journeys (regression) | Pass | 41 earlier journeys. |
| iOS startup | Not run | No iOS simulator in this run; no native module was added. |
| Android startup | Pass (startup only) | Expo Go (SDK 57) renders the sign-in screen from the release bundle. |

Browser journeys against the clean instance: 42 journeys, 241/241 steps
passed, 0 failures.

## Open items (not blocking)

-   **Automatic daily rates (FR-082)** need the owner to choose a rate
    provider. Manual rates and overrides work.
-   **The base currency is fixed to BRL (TD-013).**
-   Owner decisions pending: push notifications and invitation email
    (TD-011).
-   Decisions awaiting owner review: ADR-0017, DR-098, and
    `docs/sdds/v0.10.0/README.md`.
