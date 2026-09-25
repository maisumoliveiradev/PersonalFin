# SDD-034 --- Membership and Permissions

## Objective

Introduce memberships and server-side permission checks so a space can
be shared safely (FR-003, FR-005, ADR-0015 superseding ADR-0010).

## Scope

-   ADR-0015; ADR-0010 marked Superseded.
-   Database: `financial_space_member` (space, user, permissions,
    lifecycle timestamps).
-   API: spaces list and detail include shared spaces and the caller's
    role and permissions; every space-scoped endpoint requires the
    permission of its action.
-   Client: hide actions the member cannot perform; shared spaces in the
    space list.

## Non-scope

Invitations (SDD-035), member management UI (SDD-036).

## Acceptance

-   A member without a permission receives `403 PERMISSION_DENIED` for
    every endpoint of that action; non-members keep receiving 404.
-   Existing single-owner behavior is unchanged.

## Definition of Done

ADR, migration, OpenAPI, unit and integration tests for every
endpoint group, journey, docs, changelog.
