# SDD-059 --- Super Admin Foundation and Operations Overview

## Objective

Introduce a platform administrator role, distinct from space
administration, with an aggregate operations view (FR-100 to FR-102,
DR-100, ADR-0018).

## Scope

-   Database: `platform_admin`.
-   CLI: `npm run admin -- grant <email> | revoke <email> | list`.
-   API:
    - `platformAdmin` in `/me`;
    - `GET /admin/overview` (administrators only, aggregate counts).
-   Client: an "Administração da plataforma" screen, shown only to
    administrators.

## Acceptance

-   Non-administrators get 403.
-   Administrators get no access to any financial space.
-   The overview contains no amounts or per-user data.

## Definition of Done

ADR-0018, migration, OpenAPI, unit and integration tests, journey, docs.
