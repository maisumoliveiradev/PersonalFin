# ADR-0002 --- OpenAPI as API Contract Source of Truth

## Status

Accepted

## Context

Web and mobile clients must remain aligned with the backend while the
product evolves incrementally and mobile clients may remain on older
versions.

## Decision

Use OpenAPI as the source of truth for application API contracts once
the API layer is introduced.

Generate TypeScript contract artifacts/clients where practical instead
of manually duplicating request/response schemas.

## Consequences

-   Contract changes are explicit.
-   Client/backend drift is reduced.
-   Backward compatibility can be evaluated systematically.
-   API changes require contract updates as part of Definition of Done.
