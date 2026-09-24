# SDD-008 --- Transaction Edit with Audit History

## Objective

Allow the user to correct a transaction and keep an auditable record of
what changed (DR-015, DR-054).

## Dependencies

v0.1.0.

## Scope

-   Edit type, description, amount, financial date, category,
    subcategory, and status of a transaction in an accessible space.
-   Same validation as creation (SDD-005), including DR-072.
-   Append-only audit log (`audit_event`): space, entity type and ID,
    action, actor, UTC instant, and before/after values of changed
    fields.
-   Optimistic concurrency: the client sends the version it edited; a
    stale version is rejected with `409` instead of silently overwriting.
-   Edit screen reachable from the transaction list.

## Non-scope

Bulk edit, undo, audit history UI, tags/notes/attachments.

## Decisions

-   Audit log is introduced now as a shared mechanism (ADR required).
-   No-op edits (nothing changed) are accepted and not audited.

## Acceptance

-   User edits every editable field; the list reflects it.
-   Invalid edits are rejected like invalid creations.
-   Every effective edit creates exactly one audit event with before and
    after values; audit events cannot be updated or deleted by the app.
-   Editing with a stale version returns `409 CONFLICT`.
-   Another user cannot edit the transaction.

## Definition of Done

Migration, OpenAPI, tests (domain, API, integration), ADR, docs,
current state, changelog.
