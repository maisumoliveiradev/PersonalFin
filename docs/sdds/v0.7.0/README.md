# v0.7.0 --- Mobile Resilience

Drafted by the AI agent on 2026-09-25 under the project owner's
delegation. Sources: `ROADMAP.md` (v0.7.0), FR-091 to FR-097, DR-062 to
DR-067, and the "Offline and Synchronization" section of `AGENTS.md`.
Decisions the documents left open are listed here for owner review.

## Sequence

1.  `SDD-040-minimum-client-version.md`
2.  `SDD-041-local-persistence.md`
3.  `SDD-042-offline-transactions.md`
4.  `SDD-043-sync-conflicts.md`
5.  `SDD-044-release-validation.md`

## Decisions for owner review

-   **Architecture (ADR-0016):**
    - the TanStack Query cache is persisted locally for offline reads;
    - a local outbox holds offline writes;
    - no local SQLite replica. Metrics stay server-computed (DR-066),
      so unsynchronized changes appear in a separate "Não sincronizado"
      list and do not change totals until they reach the server.
-   **What works offline (DR-088):**
    - viewing anything already loaded;
    - creating a transaction, including a single card purchase;
    - editing a transaction, changing its status, and deleting it.

    Recurrences, installments, cards, categories, tags, balances,
    invoice payments, members, and preferences need a connection. A
    transaction with a pending offline change cannot be changed again
    until that change is synchronized or discarded. This avoids stacking
    local edits.
-   **Conflicts (DR-089, DR-090):**
    - independent field changes merge automatically;
    - when the same field changed on both sides, the user chooses per
      field;
    - edit versus delete asks whether to restore and apply, or to discard
      the local edit;
    - delete versus edit asks whether to delete anyway, or to keep the
      record.

    Resolutions are recorded in the audit event's context.
-   **Local data (DR-091):**
    - stored per user;
    - cache removed at sign-out;
    - unsynchronized changes are never dropped without explicit
      confirmation;
    - local schema versioned with migrations (FR-097);
    - no app-level encryption, only the OS or browser sandbox (TD-012).
-   **Minimum supported version:** clients send `X-Client-Version`.
    When the operator sets `MIN_CLIENT_VERSION`, older or unversioned
    clients get `426 CLIENT_UPGRADE_REQUIRED` and an update screen.
    Nothing is blocked by default.
-   **Validation:**
    - offline behavior is validated with browser journeys that cut the
      network (Playwright), because Web and native share the same client
      code;
    - Android is checked only at startup, as in previous releases (the
      owner did not authorize tap-driven emulator automation).

## Out of scope for v0.7.0

- Offline writes for other entities.
- Opening the Web app with no connection (service worker).
- Background sync while the app is closed.
- Push notifications.
- Encrypted local storage.
