# v0.2.0 --- Core Financial Control

Drafted by the AI agent on 2026-09-24 under the project owner's
delegation, from `ROADMAP.md` (v0.2.0) and `REQUIREMENTS.md`. Domain
decisions the documents left open are listed in each SDD under
"Decisions" and summarized here for owner review.

## Sequence

1.  `SDD-008-transaction-edit.md`
2.  `SDD-009-transaction-soft-delete.md`
3.  `SDD-010-transaction-status.md`
4.  `SDD-011-category-management.md`
5.  `SDD-012-transaction-filters.md`
6.  `SDD-013-balance-snapshots.md`
7.  `SDD-014-balance-update-prompt.md`
8.  `SDD-015-current-month-dashboard.md`
9.  `SDD-016-release-validation.md`

## Decisions for owner review

-   Transaction edits and deletions are recorded in an append-only audit
    log with actor, instant, action, and before/after values (DR-054).
-   Deleted transactions are hidden everywhere except a per-space
    "Lixeira" (trash) view, from which they can be restored. No permanent
    deletion in v0.2.0.
-   Changing a transaction's type requires choosing a category of the new
    kind (DR-072).
-   Archived categories disappear from new selections but keep appearing
    on the transactions that use them. A category can only be deleted
    permanently if no transaction (including deleted ones) uses it.
-   A balance snapshot may be negative or zero. It records the observed
    date (calendar date) and the recording instant; the current balance is
    the most recent snapshot by observed date, then recording instant.
-   Balance reminder frequency is stored per user and per space; default
    "on app start" only when the space has no snapshot yet, otherwise
    "every 7 days".
-   Dashboard month is the calendar month of financial dates in the
    user's local calendar; "Realized" uses Paid/Received transactions,
    "Forecast" uses Pending ones (DR-026, DR-027).
