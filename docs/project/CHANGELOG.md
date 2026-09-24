# CHANGELOG.md

All notable delivered product changes are recorded here.

The project follows incremental semantic-style product versions.

## \[Unreleased\]

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
