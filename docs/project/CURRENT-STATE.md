# CURRENT-STATE.md

## Current Version

Pre-release. SDD-001 (Project Foundation) implemented; `v0.1.0` in
progress.

## Implemented Product Capabilities

None.

No authentication flow, database schema, Financial Space, category, or
transaction functionality exists. Do not assume any of them until the
corresponding SDD is implemented and this document is updated.

## Implemented Technical Foundation

-   npm workspaces monorepo (ADR-0001, ADR-0006):
    -   `apps/client` --- Expo SDK 57 universal app shell (Web via React
        Native Web, Android, iOS). It renders only a placeholder screen.
    -   `apps/api` --- Node.js 24 + Fastify 5 API shell (ADR-0005) with
        `GET /health`, validated environment configuration, and
        structured JSON logs.
    -   `packages/api-contract` --- OpenAPI 3.1 contract (`/health`
        only) and generated TypeScript types.
-   Strict TypeScript in every workspace.
-   Biome for lint, formatting, and import ordering.
-   Vitest unit tests for the API (configuration and health check).
-   Local CI: `npm run validate`, enforced by a `pre-push` git hook.
    No hosted CI; GitHub Actions is disabled.
-   Environment strategy documented in `ARCHITECTURE.md`.
-   Git repository on GitHub with `main`/`develop` protected by a
    ruleset.

## Not Yet Present

-   Database and migrations.
-   API endpoints other than `/health`; runtime request validation.
-   Shared domain package.
-   Client navigation, Design System, theming, localization, and API
    calls from the client.
-   Client (React Native) test runner.

## Active Target

Execute `v0.1.0` incrementally.

Target user flow:

`Authenticate → Create Financial Space → Receive Initial Categories → Create Manual Income/Expense → View Saved Transaction`

## Important Constraint

Future capabilities documented in Product Vision or Roadmap are not
implemented and must not be treated as available.

## Next Action

`docs/sdds/v0.1.0/SDD-002-authentication-base.md`, after the project
owner authorizes it.
