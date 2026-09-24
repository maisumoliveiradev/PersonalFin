# v0.3.0 --- Planning and Recurrence

Drafted by the AI agent on 2026-09-24 under the project owner's
delegation, from `ROADMAP.md` (v0.3.0) and FR-037 to FR-044. Domain
decisions the documents left open are listed here for owner review.

## Sequence

1.  `SDD-017-business-day-calendar.md`
2.  `SDD-018-recurring-series.md`
3.  `SDD-019-occurrence-independence.md`
4.  `SDD-020-future-commitments.md`
5.  `SDD-021-monthly-projection.md`
6.  `SDD-022-release-validation.md`

## Decisions for owner review

-   **Business days (foundation):** weekdays that are not Brazilian
    national holidays (fixed dates plus Good Friday). State and municipal
    holidays (FR-044) need a configured locality and are left for a later
    SDD; Carnival and Corpus Christi are optional points, not national
    holidays, so they are not excluded.
-   **Recurrence model:** a series stores the rule (type, description,
    amount, category, start date, frequency, optional end date,
    non-business-day rule). Occurrences are ordinary transactions linked
    to the series, created as Pending, so they appear everywhere a
    transaction does (list, filters, dashboard forecast).
-   **Frequencies:** monthly, weekly, and yearly, every 1 period. Monthly
    series on days 29--31 use the last day of shorter months.
-   **Materialization horizon:** occurrences are created up to 12 months
    after the current month when the series is created, and extended on
    request when the user browses later months (never more than 60
    months ahead). An occurrence date is unique per series, so extending
    is idempotent.
-   **Independence:** editing, paying, or deleting one occurrence never
    changes the others (DR-031). An occurrence edited individually is
    marked and is not changed by later series edits.
-   **Series edit:** changes apply to "this and following" pending,
    unmodified occurrences from a chosen date; past and paid occurrences
    are never rewritten. Ending a series deletes (soft) its pending,
    unmodified future occurrences and keeps everything else.
-   **Projection (M-008):** projected balance at the end of month M = the
    latest observed balance up to the end of M, plus every non-deleted
    transaction dated after that observation and up to the end of M
    (income adds, expense subtracts, any status), plus pending
    transactions dated on or before the observation date (still expected,
    not yet in the observed balance). Without any observed balance there
    is no projection.
