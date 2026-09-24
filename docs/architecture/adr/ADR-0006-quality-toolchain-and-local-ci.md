# ADR-0006 --- Quality Toolchain and Local CI

## Status

Accepted (2026-09-23, SDD-001)

## Context

SDD-001 requires strict TypeScript, a formatter/linter with import
ordering, a unit-test runner, and baseline CI commands. AGENTS.md and
GIT-WORKFLOW.md expect CI validations to pass before changes reach
protected branches.

The project owner decided not to use hosted CI (GitHub Actions or
similar services). The reasons are unexpected billing in the past and
unwanted notification emails. GitHub Actions is disabled on the
repository.

## Decision

-   **Package manager / monorepo:** npm workspaces (`apps/*`,
    `packages/*`). npm ships with Node, and Expo supports npm workspaces
    without extra configuration.
-   **TypeScript:** strict mode everywhere, plus
    `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
    `noImplicitOverride`, and `noFallthroughCasesInSwitch`. The version
    is pinned to the one required by the Expo SDK.
-   **Lint, format, and import ordering:** Biome, a single tool with one
    configuration (`biome.json`). It enforces, among others,
    `noExplicitAny`, `noNestedTernary`, `useImportType`, React hook
    rules, and organized imports.
-   **Unit tests:** Vitest for API and shared packages.
-   **CI runs locally.** `npm run validate` runs lint, typecheck,
    contract check, and tests. A versioned git hook
    (`.githooks/pre-push`, enabled by `npm install` via the `prepare`
    script) runs `validate` before every push and blocks the push when
    it fails.
-   **Branch protection:** a GitHub ruleset on `main` and `develop`
    requires pull requests and blocks force pushes and deletion. It does
    not require status checks, because no hosted CI reports them.

## Alternatives Considered

1.  **GitHub Actions.** Rejected by the project owner (cost and
    notification concerns).
2.  **ESLint + Prettier.** Mature, but requires several packages and
    plugins to cover the same rules; Biome covers the required rules
    with one dependency.
3.  **pnpm.** Stricter dependency isolation, but requires installing an
    additional tool; npm workspaces are sufficient at this size.
4.  **Jest for all tests.** Needed for React Native component tests,
    which do not exist yet.
5.  **husky / simple-git-hooks.** A plain `core.hooksPath` setting
    achieves the same without a dependency.

## Consequences

-   Validation has no cost and sends no notifications.
-   Validation is enforced on the developer's machine, not by the
    server. `git push --no-verify` bypasses it, and a merge on GitHub is
    not blocked by failing checks; see TD-001.
-   React Native component tests will need a React Native-capable runner
    (for example `jest-expo`) inside `apps/client` when UI tests are
    introduced.
-   Biome has no type-aware lint rules; type-level guarantees rely on
    `tsc`.

## References

-   SDD-001 --- Project Foundation
-   NFR-009
-   `docs/engineering/GIT-WORKFLOW.md`
-   `docs/engineering/TESTING-STRATEGY.md`
