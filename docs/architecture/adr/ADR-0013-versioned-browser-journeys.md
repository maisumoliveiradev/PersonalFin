# ADR-0013 --- Versioned Browser Journeys

## Status

Accepted (2026-09-24)

## Context

Since SDD-002 every increment was validated with browser journeys
(Chrome driven by Playwright) that lived outside the repository. A
machine restart deleted them, removing the only end-to-end regression
suite of the product. TESTING-STRATEGY.md plans "critical end-to-end
flows" progressively; the journeys already exist and have caught real
defects in almost every SDD.

## Decision

-   Keep the journeys in the repository under `e2e/` (npm workspace
    `@personalfin/e2e`), one module per journey in `e2e/journeys/`,
    run by `e2e/run.mjs` with `npm run test:e2e [-- name-filter]`.
-   Use `playwright-core` (no browser download) with the locally
    installed Google Chrome, headless, timezone `America/Sao_Paulo`.
-   The journeys run against an already running API and Web client
    (`E2E_BASE_URL`, default `http://localhost:8081`; `E2E_API_URL`,
    default `http://localhost:3333`). Failure screenshots go to
    `e2e/.artifacts/` (git-ignored).
-   They are **not** part of `npm run validate` or the pre-push hook,
    because they need Chrome, Docker, and both servers running. Run them
    before merging any change that affects the client or the API, and
    in every release validation.

## Alternatives Considered

1.  **`@playwright/test` runner.** Richer reporting, but downloads its
    own browsers and adds configuration not needed yet.
2.  **Keep scripts outside the repository.** Already failed once.
3.  **Detox/Maestro for native apps.** Deferred; native coverage remains
    startup-only (TD-008).

## Consequences

-   Every UI change must keep the journeys passing; new features add
    journeys.
-   Journeys depend on visible texts and accessible names, which doubles
    as an accessibility check.

## References

-   ADR-0006, TD-006, TD-008
-   `docs/engineering/TESTING-STRATEGY.md`
