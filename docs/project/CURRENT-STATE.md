# CURRENT-STATE.md

## Current Version

Pre-release. SDD-001 (Project Foundation), SDD-002 (Base
Authentication), SDD-003 (First Financial Space), SDD-004 (Initial
Categories), SDD-005 (Manual Income and Expense), and SDD-006
(Transaction List) implemented; SDD-007 (release validation) pending;
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

-   **Categories (SDD-004):** each new space receives the default pt-BR
    catalog once (`docs/product/DEFAULT-CATEGORY-CATALOG.md`). Categories
    have a kind (Expense/Income) and optional subcategories (two levels
    at most). They can be read (API and space screen) but not created,
    renamed, archived, or deleted.

-   **Transactions (SDD-005):** users register Expense or Income with
    description, amount (BRL), financial date, category matching the
    type, optional subcategory, and status (Paid/Received or Pending).
    Transactions cannot be edited or deleted; there are no tags, notes,
    attachments, recurrence, cards, or other currencies.
-   **Transaction list (SDD-006):** the space screen lists the space's
    most recent transactions (up to 100; API limit up to 200 with
    `hasMore`), newest financial date first, with type, description,
    amount, date, category, and status. There is no search, filter,
    pagination beyond the limit, or dashboard.

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
    -   `packages/domain` --- shared money, financial date, and
        transaction rules (ADR-0011).
-   PostgreSQL 17 via Docker Compose; versioned SQL migrations with
    checksum verification (ADR-0008). Tables: Better Auth `user`,
    `session`, `account`, `verification`; `financial_space`, `category`, `financial_transaction`.
-   Strict TypeScript, Biome, Vitest unit tests, and PostgreSQL
    integration tests (`npm run test:integration`).
-   Local CI: `npm run validate` enforced by a `pre-push` git hook. No
    hosted CI; GitHub Actions is disabled.
-   Environment strategy documented in `ARCHITECTURE.md`.

## Not Yet Present

-   Transaction edit and deletion; category management; filters and
    pagination.
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

`docs/sdds/v0.1.0/SDD-007-release-validation.md`.
