# ARCHITECTURE.md

## Status

Initial target architecture. Concrete framework/library choices that are
not yet accepted must be finalized through ADRs before implementation.

Accepted platform and tooling decisions: ADR-0001 (single Expo client
for Web/Android/iOS in a monorepo), ADR-0005 (API shell), ADR-0006
(quality toolchain and local CI), ADR-0007 (authentication), ADR-0008
(PostgreSQL and migrations), ADR-0009 (client application
architecture), ADR-0013 (versioned browser journeys), ADR-0014
(recurrence materialization), ADR-0015 (shared Financial Space access
model, superseding ADR-0010), ADR-0011
(money and financial date formats, shared domain package), ADR-0012
(audit log and optimistic concurrency), ADR-0016 (offline persistence,
synchronization, and minimum client version).

## Repository structure

``` text
apps/
  client/          Expo universal app: Web (React Native Web), Android, iOS
    src/app/         Expo Router routes (screens)
    src/api/         Typed API client and TanStack Query hooks
    src/auth/        Better Auth client (Web and native variants)
    src/features/    Feature components shared by several screens
    src/i18n/        UI text catalog
    src/ui/          Design System tokens and primitives
  api/             Node.js + Fastify application API
    src/auth/        Better Auth setup and session resolution
    src/database/    Connection pool, transactions (data-access.ts),
                     migration runner, SQL migrations
    src/http/        Authentication hook, input validation, error contract
    src/modules/     Domain modules (financial-spaces/, categories/,
                     transactions/, audit/, balance/, dashboard/,
                     recurrences/, cards/, tags/, analytics/,
                     preferences/, members/):
                     domain types, use cases, repository ports,
                     PostgreSQL adapters, routes
    src/routes/      Cross-cutting HTTP routes (health, auth, me)
packages/
  api-contract/    OpenAPI contract (openapi.yaml) and generated types
  domain/          Shared domain rules: money parsing/formatting, financial
                   dates, transaction types and statuses
e2e/               Browser journeys (Playwright + local Chrome, ADR-0013)
compose.yaml       Local PostgreSQL (development and test databases)
.githooks/         Versioned git hooks (pre-push runs npm run validate)
```

Dependency direction between workspaces:

`apps/client → packages/*` and `apps/api → packages/*`.
Applications never import from each other.

## Architectural goals

-   Web, Android, and iOS.
-   Shared domain semantics across platforms.
-   Strong TypeScript contracts.
-   Incremental delivery.
-   Multi-user and Financial-Space isolation.
-   Future offline-first mobile support.
-   API backward-compatibility awareness.
-   Explainable financial calculations.
-   Living documentation.
-   No premature distributed-system complexity.

## Proposed high-level shape

A TypeScript-oriented product with:

1.  **Client applications**
    -   Web
    -   Android
    -   iOS
2.  **Application API**
    -   authentication/authorization integration;
    -   domain use cases;
    -   validation;
    -   audit orchestration;
    -   OpenAPI contract.
3.  **Relational persistence**
    -   users;
    -   Financial Spaces;
    -   memberships/permissions;
    -   categories;
    -   transactions;
    -   later domain modules.
4.  **Supporting infrastructure**
    -   object storage for future attachments;
    -   notification provider;
    -   FX provider;
    -   observability;
    -   backups.

## Layering principles

Prefer clear dependency direction:

`UI → Application/Use Cases → Domain → Ports`

Infrastructure implements ports and must not define financial meaning.

Domain rules should be testable without rendering UI or making network
calls.

## Modular boundaries

Initial modules should remain small:

-   Identity
-   Financial Spaces
-   Classification
-   Transactions

Future modules enter only through later SDDs:

-   Balance
-   Recurrence
-   Cards
-   Debt
-   Goals
-   Analytics
-   Notifications
-   Import/Export
-   Documents/OCR
-   Administration

A module boundary is a responsibility boundary, not necessarily a
deployable microservice.

## API

When the API is introduced:

-   OpenAPI is the contract source of truth;
-   generated TypeScript types/client should be preferred;
-   input is validated at boundaries;
-   authorization is enforced server-side;
-   breaking changes consider older mobile clients.

## Persistence

Use a relational model unless an accepted ADR changes this.

Requirements:

-   precise monetary representation;
-   calendar-date semantics for financial dates;
-   UTC instants for audit/technical timestamps;
-   globally unique IDs compatible with offline creation;
-   versioned schema migrations;
-   soft-delete where domain rules require historical recovery;
-   indexes based on measured query needs.

### Data access pattern

Routes and use cases receive a `DataAccess` object
(`apps/api/src/database/data-access.ts`) exposing repository ports and
`transaction(work)`. Work that must be atomic, such as creating a space
together with its default categories, runs inside `transaction`, which
gives it repositories bound to a single PostgreSQL transaction. Unit
tests supply in-memory repositories through the same interface.

### Money and dates (ADR-0011)

Money is stored as `bigint` minor units with an ISO currency code and
exchanged as the integer `amountMinor`. Financial dates are PostgreSQL
`date` values exchanged as `YYYY-MM-DD` strings; the database driver is
configured never to convert them to JavaScript `Date`. Parsing and
formatting live in `packages/domain` and are shared by API and client.

### Audit and concurrency (ADR-0012)

Mutations of financial records run in a transaction that locks the
record, checks the client's `version`, applies the change, and appends
an `audit_event` with actor and before/after values. `audit_event` is
append-only at the database level.

Transactions use soft deletion (`deleted_at`, `deleted_by_user_id`,
both required together). Deleted rows are excluded from every active
query and listed only in the space trash, from which they can be
restored; there is no permanent deletion yet.

### Consolidated balance (DR-021 to DR-025)

Observed balances are stored in `balance_snapshot`, append-only at the
database level. The current balance is the most recent snapshot by
observed date, then recording instant. Snapshots are never transactions
and never enter transaction totals.

### Cards and invoices (DR-078, DR-079)

Cards keep an append-only limit history (`card_limit_change`). Invoices
(`card_invoice`) are created on demand, one per card and reference
month, with stored closing and due dates. Installment purchases
(`card_installment_purchase`) keep the original purchase; each
installment is a card purchase linked to it by number. Invoice payments
(`card_invoice_payment`) are separate from transactions; the view
`card_invoice_balance` gives each invoice's total and paid amounts, from
which the effective status of card purchases is derived. A card purchase is a
`financial_transaction` linked to an invoice (`card_invoice_id`); the
database enforces that it is a Pending expense and not a recurrence
occurrence. Metrics group card purchases by the invoice's reference
month.

### Metrics (DR-066, DR-067)

Built-in metrics are defined once in `docs/product/METRICS.md` and
computed only by the API (`modules/dashboard`, SQL aggregates over
integer minor units). Clients display the returned values and never
recompute them.

## Offline evolution

Do not build full offline synchronization in v0.1.0.

Architecture must avoid choices that make future offline creation
impossible. When offline is introduced:

-   client-generated globally unique IDs;
-   versioned local schema;
-   explicit sync states;
-   conflict-aware synchronization;
-   no silent destructive resolution.

## Authentication (ADR-0007)

Better Auth runs inside the API and stores users and sessions in
PostgreSQL. Protected routes are registered in an authenticated Fastify
scope that resolves the session server-side and rejects missing or
invalid sessions with `401 UNAUTHENTICATED`. Web clients use an
`HttpOnly` session cookie; native clients keep the same cookie in
secure storage.

## Debts (SDD-045, DR-092)

`modules/debts` stores `debt` (the plan) and `debt_payment` (soft
delete). The summary (outstanding balance, paid and remaining
installments, next due date, progress) is computed by
`summarizeDebt` in `packages/domain` from the plan and the active
payments, so the API and any client share one definition. Debts do not
create or read transactions.

Prepayment simulation (SDD-046, DR-093) is the pure `simulatePrepayment`:
it returns the new plan and the summary that plan would produce.
`POST .../simulations` only returns it. `POST .../prepayments` recomputes
it in the same database transaction (debt row locked, version checked),
records the prepayment, and stores the plan. What is confirmed is
therefore exactly what was simulated.

## Goals (SDD-047, DR-094)

`modules/goals` serves the same handlers under two scopes:
- `/goals` for global goals, which belong only to the caller;
- `/financial-spaces/{id}/goals` for space goals, where reading needs
  `view` and changing needs `plan`.

A scope resolver turns the request into
`{ kind: 'global', ownerUserId }` or `{ kind: 'space', financialSpaceId }`,
and every repository query is filtered by it. Accumulated-amount updates
are appended to `goal_progress`, which has an append-only trigger. Only
space goals are recorded in `audit_event`, because that table is scoped
to a space. Goals are never read by the dashboard or projection
(DR-050).

## In-app reminders (SDD-048, DR-095)

`modules/reminders` computes reminders on request for the caller's local
`today` (`GET .../reminders?today=`). It reuses existing sources:
- pending non-card transactions (`transactions.list`);
- open invoices (`cardInvoices.listOpenDue`);
- debt summaries (`summarizeDebt`);
- the current month's projection (`getProjection`).

The domain function `reminderStage` maps days-until-due and the user's
offsets to a stage. The API then drops stages the user dismissed
(`reminder_dismissal`). Settings live in `reminder_setting` (defaults
when absent). Nothing is stored per reminder, so reminders always
reflect current data.

Push delivery is not implemented: it needs the owner to authorize a
hosted push service. It will reuse this computation.

## Imports (SDD-050, DR-096)

`modules/imports` implements Read → Validate → Preview → Resolve →
Confirm → Import:
- **Read:** `import-file.ts` reads CSV with `csv-parse`. The delimiter
  (`;`, `,`, or tab) and the encoding (UTF-8, falling back to Latin-1)
  are detected. XLSX is read with `read-excel-file`, numbers as text so
  they are never floating point, and dates as ISO strings. The original
  bytes and their SHA-256 are stored in `import_batch`; each row's cells
  go to `import_row`.
- **Validate and preview:** `import-mapping.ts` evaluates every row
  against the user's explicit mapping with the pure domain parsers
  (`parseImportDate`, `parseImportAmount`). It marks suspected
  duplicates: same type, date, and amount as an active transaction or an
  earlier row. Results are written in bulk (`jsonb_to_recordset`).
- **Resolve, confirm, undo:** duplicate decisions are required before
  confirmation. Confirmation creates the transactions in one database
  transaction, with `import_batch_id`, and records an `import_batch`
  audit event. Undo soft-deletes them with a normal delete audit event
  for each.
- Bodies of up to about 7 MB are accepted on the create route only
  (base64 of 5 MB).

## Offline reading (ADR-0016, SDD-041)

-   `apps/client/src/local`:
    -   `local-document.ts` keeps every stored document in a
        `{ schemaVersion, data }` envelope. It applies ordered migrations
        on read and does not read documents written by a newer schema.
    -   `local-store.ts` persists documents in AsyncStorage (Web:
        `localStorage`) under `personalfin:{schema}:{userId}`.
-   The TanStack Query cache is restored before signed-in screens render
    (`LocalPersistenceGate`) and saved at most once per second.
    -   Only successful queries are saved. Invitation lookups are never
        saved.
    -   The saved cache is discarded when the app version changes, after
        7 days, and at sign-out.
-   Connectivity comes from `expo-network` and drives TanStack Query's
    `onlineManager`, so queries pause offline.
    -   A request that fails at the network level also marks the app
        offline until `/health` answers again.
    -   Mutations use `networkMode: 'always'`, so they fail fast instead
        of hanging.
-   A global banner tells the user they are seeing saved data.

## Offline transaction changes (ADR-0016, SDD-042)

-   `apps/client/src/sync`:
    -   `outbox.ts`: pure model, local schema `outbox` v1, response
        classification.
    -   `sync-engine.ts`: per-user outbox store, serialized writes,
        ordered sending.
    -   `offline-writes.ts`: queueing helpers used by the screens.
-   A transaction create, edit, status change, or delete is queued when
    the app is offline, or when the request fails at the network level.
    Creates always carry a client UUID (`expo-crypto`), and the API
    returns the existing record on replay (`200`), so a lost response
    never duplicates a transaction.
-   Edits and deletes keep the base version and a snapshot of the fields
    (`transactionSyncFields`). An edit sends only the fields that
    changed.
-   The outbox is sent in order when connectivity returns, at startup,
    after each new entry, and on "Sincronizar agora".
    -   Success removes the entry and invalidates the space's queries.
    -   A rejected change becomes `error`. A `409` on edit or delete
        becomes `conflict` (resolved in SDD-043).
    -   `5xx` retries after 30 seconds. `401` and `426` stop sending.
-   Entries leave the outbox only when the server confirms them, or when
    the user discards them explicitly. Signing out with entries asks for
    confirmation. A transaction with a queued change cannot be changed
    again until the change is synchronized (DR-088).

## Sync conflicts (ADR-0016, SDD-043)

-   A `409` on a queued edit or delete makes the client fetch the current
    transaction and classify the conflict with the domain functions
    `reconcileEdit` and `serverChanges`:
    -   Local changes the server already has are dropped. Changes to
        fields the server did not touch are re-sent against the current
        version with `sync.resolution = auto_merged` (DR-089).
    -   A field changed on both sides, an edit of a deleted transaction,
        or a deletion of an edited transaction is stored in the outbox
        entry as `conflict` (outbox schema v2, migrated from v1). The
        "Não sincronizado" list asks the user to decide (DR-090).
-   Writes that resolve a conflict carry a sync context:
    -   PATCH and restore: `sync` in the body.
    -   DELETE: `syncResolution` and `syncBaseVersion` in the query.
-   The API stores that context in `audit_event.context` (migration
    `0022`). The audit history returns it and the audit screen shows it.

## Minimum client version (ADR-0016, SDD-040)

Clients send `X-Client-Version` (the app version from `app.json`). When
`MIN_CLIENT_VERSION` is set, an API `onRequest` hook answers
`426 CLIENT_UPGRADE_REQUIRED` to older, missing, or invalid versions on
every route except `/health` and `/api/auth/*`; the client then replaces
its navigation with an update-required screen. Unset means no check.
Raise the minimum only when an API change can no longer stay backward
compatible with installed clients.

## Financial Space access (ADR-0015)

Every Financial Space has exactly one Owner (`owner_user_id`); other
people access it through active `financial_space_member` rows with a
permission set (`view`, `record`, `plan`, `classify`, `manage_members`,
`view_audit`). Space-scoped endpoints resolve the space through
`requireAccessibleSpace(userId, spaceId, permission)`, which returns
`404 FINANCIAL_SPACE_NOT_FOUND` for missing and inaccessible spaces
alike and `403 PERMISSION_DENIED` for members without the permission.
ADR-0010 (owner-only access) is superseded. Invitations
(`space_invitation`) store only a SHA-256 hash of a random single-use
token; acceptance checks the signed-in user's email.

## Security boundaries

-   authentication proves identity;
-   authorization determines access;
-   Financial Space membership scopes data;
-   Super Admin is not a financial-data master key;
-   secrets stay outside source control;
-   sensitive financial payloads are excluded from unnecessary logs.

## Observability

Start with structured logs, health checks, and error capture when
backend infrastructure exists. Expand later to metrics/tracing/admin
views.

Implemented: the API writes structured JSON logs (pino via Fastify)
with request IDs, logs only method and path (no query strings), and
redacts `authorization` and `cookie` headers. Unhandled errors return a
generic `500 INTERNAL_ERROR` body and are logged server-side.
`GET /health` reports liveness.

## Deployment environments

-   Development
-   Staging/Homologation
-   Production

Configuration, credentials, and data must be isolated.

### Environment configuration strategy

-   The environment is always explicit. The API requires
    `APP_ENV` (`development`, `staging`, or `production`) and refuses to
    start without a valid value. It never falls back to a default
    environment.
-   Configuration comes from environment variables, validated once at
    startup (`apps/api/src/config.ts`). Business logic receives a typed
    configuration object; it does not read `process.env`.
-   Each application documents its variables in a committed
    `.env.example`. Real `.env` files are git-ignored and never
    committed.
-   Locally, `npm run dev:api` loads `apps/api/.env` when present.
    Staging and Production receive variables from their hosting
    environment's secret management, never from files in the
    repository.
-   Client (Expo) variables must use the `EXPO_PUBLIC_` prefix and are
    embedded in the client bundle, so they must never contain secrets.
    The client reads `EXPO_PUBLIC_API_URL`, validated at startup
    (`apps/client/src/config.ts`, `apps/client/.env.example`).
-   Each environment uses its own credentials and data stores; none are
    shared between environments.

API variables (`apps/api/.env.example`):

| Variable | Required | Purpose |
|---|---|---|
| `APP_ENV` | yes | `development`, `staging`, or `production` |
| `HOST`, `PORT` | no | Listen address (default `localhost:3333`) |
| `LOG_LEVEL` | no | pino log level (default `info`) |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `TEST_DATABASE_URL` | tests only | Database for integration tests; name must end in `_test` |
| `BETTER_AUTH_SECRET` | yes | At least 32 characters; unique per environment |
| `BETTER_AUTH_URL` | yes | Public base URL of the API |
| `TRUSTED_ORIGINS` | no | Comma-separated Web origins and app schemes allowed to authenticate |

## Architecture evolution

Any meaningful change to platform strategy, persistence, API style,
offline model, authentication architecture, or other durable constraint
requires review against existing ADRs.
