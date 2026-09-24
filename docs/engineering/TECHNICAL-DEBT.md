# TECHNICAL-DEBT.md

## Purpose

Track intentional implementation compromises that create meaningful
future work.

Roadmap features are not technical debt merely because they are not
implemented yet.

## Status values

-   Open
-   Planned
-   Resolved
-   Accepted

## Entry template

### TD-XXX --- Title

-   **Status:** Open
-   **Priority:** Low \| Medium \| High
-   **Origin:** SDD/release
-   **Reason:** Why the compromise was accepted.
-   **Impact:** What becomes harder/riskier.
-   **Resolution:** Expected remediation.
-   **Target version:** Optional.

## Current debt

### TD-001 --- Validation is enforced locally, not by the server

-   **Status:** Accepted
-   **Priority:** Medium
-   **Origin:** SDD-001
-   **Reason:** The project owner chose not to use hosted CI because of
    cost and notification concerns (ADR-0006).
-   **Impact:** `git push --no-verify` skips validation, and GitHub does
    not block merging a Pull Request whose branch fails validation.
-   **Resolution:** Run `npm run validate` before every merge. Revisit
    if a free, notification-free server-side check becomes acceptable.
-   **Target version:** None.

### TD-002 --- openapi-typescript peer dependency overridden to TypeScript 6

-   **Status:** Open
-   **Priority:** Low
-   **Origin:** SDD-001
-   **Reason:** `openapi-typescript` 7.13 declares `typescript@^5` as a
    peer, but Expo SDK 57 pins TypeScript 6. The root `package.json`
    `overrides` entry makes it use the workspace TypeScript.
    Generation and `contract:check` were verified to work.
-   **Impact:** An untested combination could break type generation
    after upgrades.
-   **Resolution:** Remove the override when `openapi-typescript`
    officially supports the workspace TypeScript version.
-   **Target version:** Next dependency upgrade.

### TD-003 --- Moderate `uuid` advisory in Expo build tooling

-   **Status:** Accepted
-   **Priority:** Low
-   **Origin:** SDD-001
-   **Reason:** `npm audit` reports GHSA-w5hq-g745-h8pq (`uuid` < 11.1.1)
    through `@expo/config-plugins`. The package is only used by build
    tooling, not by the shipped app. The advisory only applies when a
    buffer argument is passed to v3/v5/v6. `npm audit fix --force` would
    downgrade Expo.
-   **Impact:** None known for the running application.
-   **Resolution:** Resolved by an Expo release that updates the
    dependency; re-check `npm audit` on each Expo upgrade.
-   **Target version:** Next Expo SDK upgrade.
