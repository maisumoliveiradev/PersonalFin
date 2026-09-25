# SDD-036 --- Member Management

## Objective

Manage members of a shared space: presets, custom permissions,
removal, and leaving (FR-005, FR-006, DR-007 to DR-009).

## Scope

-   API: list members, change permissions, remove member, leave space;
    audited and version-checked.
-   Client: "Membros" screen.

## Acceptance

-   Records of a removed member stay in the space; the Owner cannot be
    removed or leave; a removed member immediately loses access.

## Definition of Done

OpenAPI, tests, journey, docs, changelog.
