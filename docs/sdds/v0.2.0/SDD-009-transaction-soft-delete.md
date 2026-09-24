# SDD-009 --- Transaction Soft Delete and Restore

## Objective

Let users remove wrong transactions without losing history (DR-055,
DR-056, FR-024).

## Dependencies

SDD-008 (audit log).

## Scope

-   Soft delete a transaction (records deletion instant and actor).
-   Deleted transactions are excluded from the list, filters, and
    dashboard.
-   "Lixeira" view per space listing deleted transactions, with restore.
-   Delete and restore are audited.
-   Confirmation before deleting.

## Non-scope

Permanent deletion, retention jobs, bulk delete.

## Acceptance

-   Deleted transaction disappears from the list and reappears after
    restore with identical values.
-   Deleting an already deleted or restoring an active transaction is
    rejected (`409`).
-   Audit events exist for delete and restore.
-   Deleted transactions cannot be edited.

## Definition of Done

Migration, OpenAPI, tests, docs, current state, changelog.
