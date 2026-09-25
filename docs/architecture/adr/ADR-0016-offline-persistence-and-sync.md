# ADR-0016 --- Offline Persistence and Synchronization

## Status

Accepted (2026-09-25, SDD-041 to SDD-043; decided by the AI agent under
the project owner's delegation, pending owner review)

## Context

v0.7.0 (Mobile Resilience) introduces offline-capable local
persistence, synchronization, conflict resolution, local schema
migrations, visible sync states, and a minimum-supported-version policy
(FR-091 to FR-097, DR-062 to DR-065). The API already provides:
- application-generated UUIDs (ADR-0008);
- optimistic concurrency with `version` and an append-only audit log
  (ADR-0012);
- server-computed metrics that clients never recompute (DR-066,
  DR-067).

The client uses TanStack Query for server state (ADR-0009) and runs in
Expo Go on devices. New native modules must therefore be ones Expo Go
already ships.

## Decision

-   **Offline reads:** the TanStack Query cache is persisted locally and
    restored at startup. Data viewed before is available offline. It is
    presented as the last known server state, with a visible offline
    indicator. Queries pause while offline instead of failing.
-   **Offline writes:** the only writes accepted offline are
    transactions:
    - create, including a single card purchase;
    - edit;
    - status change;
    - delete.

    The most frequent offline need is recording spending. Every other
    write (categories, cards, members, recurrences, installments, balance
    snapshots, and so on) still requires a connection.
-   **Outbox:** offline writes are stored in a per-user local outbox. It
    is processed in order when connectivity returns, at startup, after
    each new entry, and on demand. An entry keeps:
    - its request;
    - the base version;
    - a snapshot of the fields as the user last saw them.

    The outbox is never cleared silently. Entries are removed only when
    the server confirms them, or when the user explicitly discards one.
-   **Identifiers:** offline creates carry a client-generated UUID. The
    API accepts an optional `id` on transaction creation. Replaying the
    same id from the same author in the same space returns the existing
    record, so a lost response is safe to retry. Any other reuse of the
    id is rejected.
-   **Conflicts:** they are detected with the existing `version`
    (`409 VERSION_CONFLICT`, `TRANSACTION_DELETED`). They are classified
    by a three-way comparison of base, local, and server fields, as pure
    domain functions:
    - independent field changes merge automatically (DR-062);
    - same-field changes need an explicit choice per field (DR-063);
    - edit versus delete needs an explicit choice (DR-064).

    Writes that resolve a conflict record the resolution in a new
    `context` field of the audit event (DR-065, FR-094 to FR-096).
-   **Metrics stay server-side:** unsynchronized changes are listed
    apart ("Não sincronizado") and do not change dashboards, projections,
    or analytics until the server accepts them. This keeps DR-066 and
    DR-067.
-   **Storage:** `@react-native-async-storage/async-storage`. It ships
    in Expo Go, and on Web it uses `localStorage`. A small `local-store`
    module keeps every stored document in an envelope with a
    `schemaVersion` and applies ordered migrations on read (FR-097).
    Data written by a newer schema is left untouched and not used. The
    query cache is also discarded when the app version changes. The
    outbox is migrated, never discarded.
-   **Connectivity:** `expo-network`, already a dependency and shipped
    in Expo Go, drives TanStack Query's `onlineManager` and the sync
    state. A request that fails at the network level is also treated as
    offline.
-   **Scope by user:** local data is keyed by user id. The query cache is
    removed at sign-out. Signing out with unsynchronized changes asks
    for explicit confirmation, and those changes are discarded.
-   **Minimum supported version (SDD-040):**
    - clients send `X-Client-Version`;
    - when `MIN_CLIENT_VERSION` is configured, the API answers
      `426 CLIENT_UPGRADE_REQUIRED` to older or unversioned clients on
      every route except health and authentication;
    - the client then shows an update-required screen.

## Alternatives Considered

1.  **SQLite (`expo-sqlite`) as a local replica with a sync protocol.**
    It gives full offline queries. But it needs the client to recompute
    metrics, which DR-066 forbids. It also duplicates the server schema,
    and on Web it requires WASM with cross-origin isolation headers.
    That is too large for this increment.
2.  **TanStack paused mutations as the queue.** They are simple, but
    have no base snapshot, no conflict classification, no per-entry
    state for the UI, and no controlled schema versioning.
3.  **Last-write-wins.** It violates DR-063 to DR-065.
4.  **Offline writes for every entity.** It multiplies conflict rules,
    for example for invoice payments and membership. Transactions cover
    the core need, and the others can follow when required.

## Consequences

-   A new runtime dependency (AsyncStorage), and client unit tests for
    pure modules.
-   The Web keeps working through connection drops while the page is
    open. Opening the Web app with no connection is not supported,
    because there is no service worker.
-   Local data is protected by the operating system sandbox and browser
    storage, not by application-level encryption (TD-012).
-   Users can see stale data offline. The indicator makes this explicit.

## References

-   FR-091 to FR-097; DR-062 to DR-067; DR-088 to DR-091
-   ADR-0008, ADR-0009, ADR-0012
-   SDD-040 to SDD-044
