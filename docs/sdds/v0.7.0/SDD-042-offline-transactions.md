# SDD-042 --- Offline Transaction Changes and Sync States

## Objective

Record and change transactions offline, and synchronize them safely with
visible states (FR-091 to FR-093, DR-088, ADR-0016).

## Scope

-   API:
    - `POST .../transactions` accepts an optional client `id`;
    - replaying the same id by the same author in the same space returns
      the existing record (200);
    - any other reuse gets `409 TRANSACTION_ID_CONFLICT`.
-   Client outbox, persisted per user and versioned:
    - creates (single transaction or single card purchase), edits,
      status changes, and deletes are queued when offline or when the
      request fails at the network level;
    - processed in order when online, at startup, after enqueue, and on
      demand.
-   Sync states (FR-093):
    - offline, pending (N), syncing, synced, error;
    - a status line on the space screen;
    - a "Não sincronizado" list with each entry's state and a discard
      action that needs confirmation;
    - rows with a pending change are marked and cannot be changed again
      until synchronized.
-   Options that need a connection are disabled offline: recurrence,
    installments, and non-transaction actions.

## Non-scope

Conflict resolution UI (SDD-043).

## Acceptance

-   A transaction created offline appears in the pending list, is sent
    once when the connection returns (no duplicate on retry), and then
    appears in the month list and totals.
-   Offline edit, status change, and delete are applied on reconnect.
-   Errors (for example, a category archived meanwhile) remain visible
    until the user retries or discards them.

## Definition of Done

OpenAPI, API unit and integration tests (idempotent create), client
unit tests, journeys with network cut, docs, changelog.
