# ADR-0014 --- Recurrences as Materialized Occurrences

## Status

Accepted (2026-09-24, SDD-018)

## Context

FR-040 to FR-043 and DR-030 to DR-034 require recurring income and
expenses whose occurrences are independently editable and appear in
forecasts. Occurrences could be computed on read (virtual) or stored.

## Decision

-   A series is stored in `recurrence_series` (rule and defaults).
    Each occurrence is an ordinary `financial_transaction` created as
    Pending, linked by `recurrence_series_id` and `occurrence_date`
    (the unadjusted scheduled date, unique per series). Its financial
    date is the business-day-adjusted date (SDD-017).
-   Occurrences are materialized when the series is created, through
    the end of the month 12 months after the server's current (UTC)
    month, and extended on request (`POST .../recurrences/materialize`)
    up to 60 months ahead. The client requests extension when the user
    browses forward. The unique key makes extension idempotent, and a
    per-series row lock serializes concurrent requests.
-   Schedules are pure functions in `packages/domain` (monthly on
    day-of-month with end-of-month clamping, weekly, yearly with
    29 February clamping).

## Alternatives Considered

1.  **Virtual occurrences computed on read.** No storage growth, but
    every query (list, filters, dashboard, projection) would have to
    merge virtual and stored rows, and editing one occurrence would
    still need to store it.
2.  **Materialize the whole series.** Impossible for series without an
    end date.

## Consequences

-   Occurrences behave exactly like transactions (edit, status, delete,
    filters, metrics) with no special cases.
-   Months beyond the horizon show occurrences only after the client
    requests materialization.
-   Series edits (SDD-019) must update stored future occurrences.

## References

-   SDD-017, SDD-018, SDD-019; ADR-0012
