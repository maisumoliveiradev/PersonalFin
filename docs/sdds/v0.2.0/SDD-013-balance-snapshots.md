# SDD-013 --- Consolidated Balance Snapshots

## Objective

Let users record the observed consolidated balance of a space as
append-only history (FR-033 to FR-035, DR-021 to DR-024).

## Dependencies

v0.1.0.

## Scope

-   Record a snapshot: amount (may be negative or zero), observed date
    (defaults to today), optional note.
-   Current balance = latest snapshot by observed date, then recording
    instant.
-   Snapshot history list per space.
-   Snapshots are never updated or overwritten; corrections are new
    snapshots.

## Non-scope

Bank accounts, projection, balance charts, deleting snapshots.

## Acceptance

-   New snapshot appears in history and becomes current when it is the
    latest.
-   Older snapshots remain unchanged.
-   A snapshot is not a transaction and does not appear in the
    transaction list or totals.

## Definition of Done

Migration, OpenAPI, tests, docs, current state, changelog.
