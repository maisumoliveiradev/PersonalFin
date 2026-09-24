# ADR-0012 --- Audit Log and Optimistic Concurrency

## Status

Accepted (2026-09-24, SDD-008)

## Context

From v0.2.0, financial records can be edited, deleted, and restored.
DR-054 and FR-098 require relevant changes to preserve who changed what
and when. The target product has several devices per user, shared spaces
later, and offline sync (v0.7.0), so concurrent edits must never
silently overwrite each other (AGENTS.md, DR-063).

## Decision

-   **Audit log:** one append-only table, `audit_event`, with space,
    entity type and ID, action, actor, UTC instant, and a `changes` JSON
    object of `{ field: { before, after } }`. A database trigger rejects
    `UPDATE` and `DELETE` on the table. Entity types and actions are
    constrained by check constraints and widened by migrations as
    features need them.
-   Audit events are written in the same database transaction as the
    change they describe, by the application use case (not triggers), so
    the actor comes from the authenticated request.
-   **Optimistic concurrency:** editable records carry an integer
    `version`, returned by the API. Edits must send the version they were
    based on. A mismatch returns `409 VERSION_CONFLICT`; the update is
    also guarded by `WHERE version = $expected` and the row is locked
    during the use case.
-   No-op edits do not create a version or an audit event.

## Alternatives Considered

1.  **Database triggers writing audit rows.** They would not know the
    application actor without session variables, and they couple audit
    content to the schema.
2.  **Last write wins.** Silently discards concurrent changes.
3.  **Timestamps (`updated_at`) as concurrency token.** Clock precision
    and clock skew make integers safer.

## Consequences

-   Every new mutation of a financial record must record an audit event
    in its use case and be covered by tests.
-   Audit history has no UI yet.
-   The same `version` mechanism will support offline sync conflict
    detection later.

## References

-   SDD-008, DR-054, DR-063, FR-098, NFR-002
