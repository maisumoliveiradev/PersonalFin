# ARCHITECTURE.md

## Status

Initial target architecture. Concrete framework/library choices that are
not yet accepted must be finalized through ADRs before implementation.

Accepted platform and tooling decisions: ADR-0001 (single Expo client
for Web/Android/iOS in a monorepo), ADR-0005 (API shell), ADR-0006
(quality toolchain and local CI), ADR-0007 (authentication), ADR-0008
(PostgreSQL and migrations), ADR-0009 (client application
architecture), ADR-0010 (Financial Space access model), ADR-0011
(money and financial date formats, shared domain package), ADR-0012
(audit log and optimistic concurrency).

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
                     transactions/, audit/):
                     domain types, use cases, repository ports,
                     PostgreSQL adapters, routes
    src/routes/      Cross-cutting HTTP routes (health, auth, me)
packages/
  api-contract/    OpenAPI contract (openapi.yaml) and generated types
  domain/          Shared domain rules: money parsing/formatting, financial
                   dates, transaction types and statuses
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

## Financial Space access (ADR-0010)

Every Financial Space has exactly one Owner (`owner_user_id`). In v0.1
only the Owner can access a space. Space-scoped endpoints resolve the
space through `requireAccessibleSpace`, which returns
`404 FINANCIAL_SPACE_NOT_FOUND` for missing and inaccessible spaces
alike.

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
