# SDD-038 --- Space Audit History

## Objective

Show who changed what in a space (FR-098, roadmap: audit expansion).

## Scope

-   API: paginated audit events of a space with actor name, entity,
    action, and field changes (requires `view_audit`).
-   Client: "Histórico de alterações" screen.

## Non-scope

Export, filtering by entity beyond type.

## Acceptance

-   Members without `view_audit` receive 403; events are read-only.

## Definition of Done

OpenAPI, tests, journey, docs, changelog.
