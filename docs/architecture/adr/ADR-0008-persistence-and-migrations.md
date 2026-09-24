# ADR-0008 --- PostgreSQL Persistence and SQL Migrations

## Status

Accepted (2026-09-23, SDD-002)

## Context

ARCHITECTURE.md prescribes a relational model with precise money,
date-only financial dates, UTC instants, globally unique IDs, and
versioned migrations (NFR-006). SDD-002 introduces the first persistent
data (authentication), and SDD-003 to SDD-006 add domain tables.

## Decision

-   **Database:** PostgreSQL 17. Local development runs it through
    Docker Compose (`compose.yaml`) on `127.0.0.1:5433` with two
    databases: `personalfin_dev` and `personalfin_test`. The compose
    credentials are local-only and never used elsewhere.
-   **Driver:** `pg` (node-postgres) with a connection pool. Queries are
    parameterized SQL written in persistence adapters. No ORM.
-   **Migrations:** plain SQL files in
    `apps/api/src/database/migrations/NNNN_description.sql`, applied in
    order by a small runner (`apps/api/src/database/migrator.ts`) that:
    -   takes a PostgreSQL advisory lock, so concurrent runs are safe;
    -   applies each pending file in its own transaction and records it
        in `schema_migrations` with a SHA-256 checksum;
    -   refuses to run when an applied migration was modified or when
        the database contains migrations unknown to the release.
-   Migrations are **forward-only**. Recovery follows AGENTS.md:
    application rollback, forward corrective migration, or backup
    restore, chosen per failure mode.
-   **Identifiers:** `uuid` columns. Domain records use
    application-generated UUIDs so they can later be created offline
    (FR-092).
-   Run `npm run db:migrate` explicitly; the API does not migrate on
    startup.

## Alternatives Considered

1.  **Drizzle ORM / drizzle-kit.** Typed schema and generated
    migrations, but adds an abstraction layer over SQL that is not
    needed at this size.
2.  **Prisma.** Heavy code generation and runtime engine.
3.  **Kysely.** Typed query builder. A reasonable later addition if
    hand-written SQL becomes error-prone.
4.  **node-pg-migrate.** Mature, but a runner of about 80 lines covers
    the requirements without a dependency.
5.  **Hosted database for development.** Rejected (cost).

## Consequences

-   Schema is explicit and reviewable SQL.
-   Query result types are declared by hand in adapters and verified by
    integration tests.
-   Integration tests need Docker running (`npm run db:up`) and run with
    `npm run test:integration`. They are not part of the pre-push hook
    (TD-006).

## References

-   SDD-002 --- Base Authentication
-   NFR-006, FR-092, DR-002, DR-051, DR-052
-   ADR-0003, ADR-0004, ADR-0007
