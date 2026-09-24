# CHANGELOG.md

All notable delivered product changes are recorded here.

The project follows incremental semantic-style product versions.

## \[Unreleased\]

### Current-Month Dashboard (SDD-015)

-   "Resumo do mês" card on the space screen, following the selected
    month: realized income, expenses, and net; forecast (pending) income
    and expenses; realized expenses by category; and, for past months,
    the balance observed up to the end of the month.
-   Metric catalog `docs/product/METRICS.md` (M-001 to M-007); values are
    computed only by `GET /financial-spaces/{spaceId}/dashboard?month=`.
-   Fixed: recording a balance now refreshes the dashboard.

### Balance Update Prompt (SDD-014)

-   The space screen asks "Qual é o seu saldo hoje?" when the balance
    reminder is due (DR-074), with "Informar saldo" and "Depois" (hidden
    until the next app start).
-   Each user configures the frequency per space in the balance history
    screen: on app start, daily, every N days (1--90), or never; default
    every 7 days.
-   `GET` and `PUT /financial-spaces/{spaceId}/balance-reminder`;
    migration `0010_balance_reminder_settings`; due-date rules in
    `packages/domain`.

### Consolidated Balance Snapshots (SDD-013)

-   Each space shows its observed consolidated balance ("Saldo
    observado") with the date it refers to; users record a new balance
    (zero or negative allowed, optional note) and see the full history.
-   Snapshots are append-only: new records never overwrite earlier ones,
    enforced by the database (DR-024). They are not transactions.
-   `GET` and `POST /financial-spaces/{spaceId}/balance-snapshots`;
    migration `0009_balance_snapshots`.
-   `packages/domain` parses signed balance input.

### Transaction Filters and Search (SDD-012)

-   The transaction list is organized by month (current month by default,
    with previous/next navigation; the month is kept in the URL) and
    jumps to the month of a transaction after it is saved.
-   Optional filters: type, status, category (including subcategory
    matches), and case- and accent-insensitive search in descriptions.
-   Cursor pagination with "Carregar mais"; every matching transaction
    appears exactly once.
-   `GET .../transactions` accepts `month`, `type`, `status`,
    `categoryId`, `q`, and `cursor`, and returns `nextCursor`.
-   Migration `0008_transaction_search` enables the PostgreSQL `unaccent`
    extension.

### Category Management (SDD-011)

-   New "Categorias" screen per space: create categories (with kind) and
    subcategories, rename, archive/unarchive, and permanently delete
    never-used ones. Changes are audited and version-checked.
-   Archived categories are hidden from new transactions but kept on
    existing ones (DR-073); used categories cannot be deleted
    (`409 CATEGORY_IN_USE`).
-   `POST .../categories`, `PATCH` and `DELETE .../categories/{id}`;
    category items expose `archived` and `version`.
-   The read-only category overview on the space screen was replaced by a
    link to the management screen.

### Quick Status Change (SDD-010)

-   Each transaction in the list has a button to mark it as Paid/Received
    or back to Pending; the change is version-checked and audited, and a
    conflicting change shows an error and refreshes the list.

### Transaction Soft Delete and Restore (SDD-009)

-   Transactions can be deleted from the edit screen after confirmation;
    they move to the space's Lixeira (trash) and can be restored with
    identical values.
-   Deleted transactions are excluded from the list and cannot be edited
    (`409 TRANSACTION_DELETED`); delete and restore are audited and
    version-checked.
-   `DELETE .../transactions/{id}?version=`, `POST .../restore`, and
    `GET .../transactions?state=deleted`.

### Transaction Edit (SDD-008)

-   Transactions can be edited (all fields) from the list; the form is
    shared with creation.
-   Every effective edit is recorded in the append-only audit log with
    actor and before/after values (ADR-0012).
-   Optimistic concurrency: edits based on an outdated version are
    rejected with `409 VERSION_CONFLICT` instead of overwriting.
-   `GET` and `PATCH /financial-spaces/{spaceId}/transactions/{transactionId}`;
    transactions now expose `version`.
-   Fixed: option groups and buttons now expose their selected, disabled,
    and busy states to Web screen readers.

## \[0.1.0\] --- 2026-09-24

Released to `main` and tagged `v0.1.0`. Validated in SDD-007
(`docs/sdds/v0.1.0/SDD-007-validation-report.md`).

First usable vertical slice: authenticate, create a Financial Space,
receive default categories, register income and expenses, and list
them on Web (and Android/iOS from the same codebase).

### Release validation (SDD-007)

-   Validation report recorded; no new functionality.
-   Development `TRUSTED_ORIGINS` example now includes `exp://` so Expo Go
    can authenticate.
-   Workspace and app versions set to 0.1.0.

### Transaction List (SDD-006)

-   The space screen lists its transactions (newest financial date
    first) with type, description, amount, date, category/subcategory,
    and status, plus loading, error, and empty states.
-   `GET /financial-spaces/{spaceId}/transactions` with `limit`
    (default 100, max 200) and `hasMore`.
-   Amounts and dates are formatted for pt-BR without changing stored
    values.

### Manual Income and Expense (SDD-005)

-   Users register an Expense or Income with description, amount, date,
    category, optional subcategory, and status (Paid/Received by
    default, or Pending), in BRL.
-   `POST /financial-spaces/{spaceId}/transactions`; categories must
    belong to the space and match the type (`422 CATEGORY_NOT_AVAILABLE`).
-   Money stored as integer centavos (`bigint`) and exchanged as
    `amountMinor`; financial dates stored as `date` and exchanged as
    `YYYY-MM-DD` without timezone conversion (ADR-0011).
-   New shared package `packages/domain` for money and date rules.
-   Migration `0004_transactions`; transaction author recorded.
-   Recorded TD-008 and TD-009.

### Initial Categories (SDD-004)

-   Every new Financial Space receives the default pt-BR category
    catalog exactly once, in the same transaction that creates the space
    (`docs/product/DEFAULT-CATEGORY-CATALOG.md`).
-   Categories have a kind (Expense or Income) and at most one level of
    subcategories, enforced by the database. DR-072 was proposed.
-   `GET /financial-spaces/{spaceId}/categories` returns the category
    tree; the space screen shows it grouped by kind.
-   Migration `0003_categories`.

### First Financial Space (SDD-003)

-   Users create Financial Spaces (name only); the creator is the Owner
    and the space starts Active.
-   New users are guided to create their first space (name suggested as
    "Pessoal"); users list, select, and enter their spaces.
-   `GET /financial-spaces`, `POST /financial-spaces`, and
    `GET /financial-spaces/{spaceId}`; inaccessible spaces return `404`.
-   Migration `0002_financial_spaces`.
-   Request validation with zod and `400 VALIDATION_FAILED` errors.
-   ADR-0010 (Financial Space ownership and access model).

### Base Authentication (SDD-002)

-   Email/password sign-up, sign-in, sign-out, and session restoration
    on Web, Android, and iOS (Better Auth, ADR-0007).
-   Protected area in the client; signed-out users only reach sign-in and
    sign-up.
-   `GET /me` protected endpoint; all protected API routes reject
    missing or invalid sessions with `401 UNAUTHENTICATED`.
-   PostgreSQL persistence with versioned SQL migrations (ADR-0008) and
    local Docker Compose database.
-   Client architecture: Expo Router, TanStack Query, typed
    `openapi-fetch` client, pt-BR text catalog, and first Design System
    tokens/components (ADR-0009).
-   Standard API error body (`{ error: { code, message } }`).
-   Recorded TD-004 to TD-007.

### Foundation (SDD-001)

-   npm workspaces monorepo with `apps/client` (Expo universal app shell
    for Web, Android, iOS), `apps/api` (Fastify API shell with
    `GET /health`), and `packages/api-contract` (OpenAPI contract and
    generated types).
-   Strict TypeScript, Biome lint/format/import ordering, and Vitest
    unit tests.
-   Local CI via `npm run validate` and a `pre-push` git hook.
-   Validated API environment configuration and structured logging.
-   Accepted ADR-0001 (platform strategy); added ADR-0005 (API shell)
    and ADR-0006 (quality toolchain and local CI).
-   Recorded TD-001, TD-002, and TD-003.

### Documentation

-   Established initial product vision.
-   Established requirements and domain-rule catalogs.
-   Established architecture and engineering documentation.
-   Established agent operating rules and specialist skills.
-   Prepared v0.1.0 SDD sequence.

