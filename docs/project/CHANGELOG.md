# CHANGELOG.md

All notable delivered product changes are recorded here.

The project follows incremental semantic-style product versions.

## \[Unreleased\]

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

## \[0.1.0\]

Not released.
