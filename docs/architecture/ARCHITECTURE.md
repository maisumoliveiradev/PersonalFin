# ARCHITECTURE.md

## Status

Initial target architecture. Concrete framework/library choices that are
not yet accepted must be finalized through ADRs before implementation.

Accepted platform and tooling decisions: ADR-0001 (single Expo client
for Web/Android/iOS in a monorepo), ADR-0005 (API shell), ADR-0006
(quality toolchain and local CI).

## Repository structure

``` text
apps/
  client/          Expo universal app: Web (React Native Web), Android, iOS
  api/             Node.js + Fastify application API
packages/
  api-contract/    OpenAPI contract (openapi.yaml) and generated types
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

## Offline evolution

Do not build full offline synchronization in v0.1.0.

Architecture must avoid choices that make future offline creation
impossible. When offline is introduced:

-   client-generated globally unique IDs;
-   versioned local schema;
-   explicit sync states;
-   conflict-aware synchronization;
-   no silent destructive resolution.

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
with request IDs and redacts `authorization` and `cookie` headers.
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
    The client reads no environment variables yet.
-   Each environment uses its own credentials and data stores; none are
    shared between environments.

## Architecture evolution

Any meaningful change to platform strategy, persistence, API style,
offline model, authentication architecture, or other durable constraint
requires review against existing ADRs.
