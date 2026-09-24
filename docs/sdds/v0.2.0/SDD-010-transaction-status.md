# SDD-010 --- Quick Transaction Status Change

## Objective

Let users mark a transaction as Paid/Received or back to Pending
directly from the list (DR-011).

## Dependencies

SDD-008.

## Scope

-   Status toggle action on each list item.
-   Uses the edit endpoint with optimistic concurrency; audited.

## Non-scope

Bulk status change, automatic status by date.

## Acceptance

-   Toggling updates the list and records an audit event.
-   A stale version shows a conflict message and refreshes the list.

## Definition of Done

Tests, docs, current state, changelog.
