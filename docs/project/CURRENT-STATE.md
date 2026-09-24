# CURRENT-STATE.md

## Current Version

Pre-release. SDD-001 (Project Foundation), SDD-002 (Base
Authentication), and SDD-003 (First Financial Space) implemented;
`v0.1.0` in progress.

## Implemented Product Capabilities

-   **Authentication (SDD-002):** email/password sign-up, sign-in,
    sign-out, and session restoration on Web, Android, and iOS. Signed-in
    users see a protected home screen with their name. There is no email
    verification, password recovery, social login, MFA, or device/session
    management.

-   **Financial Spaces (SDD-003):** an authenticated user creates spaces
    by name, becomes their single Owner, and lists, selects, and enters
    them. Only the Owner can access a space (ADR-0010). Spaces are always
    Active; there is no rename, archive, deletion, sharing, or
    invitation. The selected space is carried in the URL
    (`/spaces/{spaceId}`), not persisted as a preference.

No category or transaction functionality exists. Do not assume either
until the corresponding SDD is implemented and this document is
updated.

## Implemented Technical Foundation

-   npm workspaces monorepo (ADR-0001, ADR-0006):
    -   `apps/client` --- Expo SDK 57 app (Web via React Native Web,
        Android, iOS) with Expo Router, protected routes, TanStack Query,
        typed API client, pt-BR text catalog, and initial Design System
        tokens/components (ADR-0009).
    -   `apps/api` --- Node.js 24 + Fastify 5 API (ADR-0005) with Better
        Auth (ADR-0007), `GET /health`, protected `GET /me`, standard
        error body, validated configuration, structured logs.
    -   `packages/api-contract` --- OpenAPI 3.1 contract and generated
        TypeScript types.
-   PostgreSQL 17 via Docker Compose; versioned SQL migrations with
    checksum verification (ADR-0008). Tables: Better Auth `user`,
    `session`, `account`, `verification`; `financial_space`.
-   Strict TypeScript, Biome, Vitest unit tests, and PostgreSQL
    integration tests (`npm run test:integration`).
-   Local CI: `npm run validate` enforced by a `pre-push` git hook. No
    hosted CI; GitHub Actions is disabled.
-   Environment strategy documented in `ARCHITECTURE.md`.

## Not Yet Present

-   Categories, transactions.
-   Shared domain package.
-   Localization beyond pt-BR (TD-004); user-selectable theme (TD-005).
-   Client (React Native) test runner.

## Active Target

Execute `v0.1.0` incrementally.

Target user flow:

`Authenticate → Create Financial Space → Receive Initial Categories → Create Manual Income/Expense → View Saved Transaction`

## Important Constraint

Future capabilities documented in Product Vision or Roadmap are not
implemented and must not be treated as available.

## Next Action

`docs/sdds/v0.1.0/SDD-004-default-categories.md`.
