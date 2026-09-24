# CURRENT-STATE.md

## Current Version

`v0.2.0`, released on 2026-09-24 (`main`, tag `v0.2.0`). SDD-001 to
SDD-016 implemented and validated. `develop` is building v0.3.0:
SDD-017 to SDD-020 implemented.

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

-   **Categories (SDD-004, SDD-011):** each new space receives the default
    pt-BR catalog once (`docs/product/DEFAULT-CATEGORY-CATALOG.md`).
    Categories have a kind (Expense/Income) and optional subcategories
    (two levels at most). Users create, rename, archive/unarchive, and
    delete never-used categories (DR-073); changes are audited. There is
    no reordering, merging, or historical reclassification.

-   **Transactions (SDD-005):** users register Expense or Income with
    description, amount (BRL), financial date, category matching the
    type, optional subcategory, and status (Paid/Received or Pending).
    There are no tags, notes, attachments, recurrence, cards, or other
    currencies.
-   **Transaction edit (SDD-008):** every field can be edited from the
    list; edits are audited (actor, instant, before/after) and protected
    by optimistic concurrency (`version`, `409 VERSION_CONFLICT`). There
    is no audit history screen.
-   **Soft delete (SDD-009):** transactions can be deleted (with
    confirmation) and restored from the space's Lixeira; deletion and
    restore are audited. There is no permanent deletion.
-   **Balance snapshots (SDD-013):** each space shows its latest observed
    consolidated balance and date; users record new snapshots (zero or
    negative allowed) and view the append-only history. There is no
    projection.
-   **Balance reminder (SDD-014):** an in-app prompt on the space screen
    when an update is due (DR-074), with per-user, per-space frequency.
    There are no push or email notifications.
-   **Monthly dashboard (SDD-015):** the space screen summarizes the
    selected month with the metrics defined in `docs/product/METRICS.md`
    (realized, forecast, expenses by category, month-end observed
    balance). There are no charts over time, comparisons, projection, or
    personalization.
-   **Recurrences (SDD-018):** monthly, weekly, or yearly series with
    optional end date and non-business-day rule; occurrences are Pending
    transactions created 12 months ahead and extended when browsing
    (ADR-0014). Occurrences are independent; "Este e os próximos" and
    "Encerrar" change the series without rewriting paid or individually
    edited occurrences (DR-076). Frequency and start date cannot be
    changed.
-   **Future commitments (SDD-020):** overdue and upcoming pending
    income/expenses (7, 30, or 90 days) with exact totals. There are no
    notifications.
-   **Quick status change (SDD-010):** each list item toggles between
    Paid/Received and Pending (audited, version-checked).
-   **Transaction list (SDD-006, SDD-012):** the space screen lists
    transactions of one month at a time (current month by default,
    navigable, kept in the URL), newest financial date first, with type,
    description, amount, date, category, and status. Optional filters:
    type, status, category, and accent-insensitive text search; results
    are paged by cursor ("Carregar mais"). There is no cross-space search
    or saved filters.

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
    -   `packages/domain` --- shared money, financial date, transaction,
        month, balance-reminder, and business-day rules (ADR-0011;
        national holidays in `docs/product/BUSINESS-DAYS.md`).
-   PostgreSQL 17 via Docker Compose; versioned SQL migrations with
    checksum verification (ADR-0008). Tables: Better Auth `user`,
    `session`, `account`, `verification`; `financial_space`, `category`, `financial_transaction`, `audit_event`,
    `balance_snapshot`, `balance_reminder_setting`, `recurrence_series`.
-   Strict TypeScript, Biome, Vitest unit tests, and PostgreSQL
    integration tests (`npm run test:integration`).
-   Local CI: `npm run validate` enforced by a `pre-push` git hook. No
    hosted CI; GitHub Actions is disabled.
-   Environment strategy documented in `ARCHITECTURE.md`.

## Not Yet Present

-   Localization beyond pt-BR (TD-004); user-selectable theme (TD-005).
-   Client (React Native) test runner.

## Active Target

`v0.3.0` --- Planning and Recurrence (`docs/sdds/v0.3.0/`).

## Important Constraint

Future capabilities documented in Product Vision or Roadmap are not
implemented and must not be treated as available.

## Next Action

`docs/sdds/v0.3.0/SDD-021-monthly-projection.md`. Domain decisions
taken under delegation await owner review (`docs/sdds/v0.2.0/README.md`,
`docs/sdds/v0.3.0/README.md`, DR-072 to DR-076).
