# SDD-041 --- Local Persistence and Offline Reading

## Objective

Keep data already loaded usable without a connection, with a versioned
local schema and a visible connectivity state (FR-091, FR-093, FR-097,
ADR-0016).

## Scope

-   `local-store`:
    - versioned envelope with ordered migrations;
    - user-scoped keys;
    - newer schemas are not read.
-   The query cache is persisted, throttled, and restored at startup. It
    is discarded when the app version changes or at sign-out, and never
    mixed between users.
-   Connectivity from `expo-network` drives TanStack Query's
    `onlineManager`, so queries pause offline.
-   Offline banner: "Sem conexão. Mostrando os dados salvos neste
    aparelho."
-   Client unit tests for the pure local-store logic.

## Non-scope

Offline writes (SDD-042), conflicts (SDD-043), service worker.

## Acceptance

-   After viewing a space online, cutting the network keeps the space,
    its transactions, and its dashboard visible with the offline banner.
-   Reconnecting refreshes data and hides the banner.
-   Signing out removes the persisted cache.
-   Data stored by an older schema version is migrated; data from a newer
    one is ignored.

## Definition of Done

ADR-0016, dependency, tests, journey with network cut, docs, TD-012,
changelog.
