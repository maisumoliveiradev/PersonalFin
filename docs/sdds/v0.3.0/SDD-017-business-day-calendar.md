# SDD-017 --- Business-Day Calendar Foundation

## Objective

Provide deterministic business-day rules for recurrence adjustment
(FR-043, FR-044 foundation).

## Scope

-   `packages/domain`: Brazilian national holidays for any year (fixed
    dates, Good Friday from the Easter computus), `isBusinessDay`, and
    `adjustToBusinessDay(date, rule)` with rules `keep`, `previous`,
    `next`.
-   Holiday list documented in `docs/product/BUSINESS-DAYS.md`.

## Non-scope

State/municipal holidays, locality configuration, holiday UI.

## Acceptance

-   Known holidays (including Easter-based dates across several years)
    are identified; weekends are never business days.
-   Adjustment moves across consecutive non-business days and month
    boundaries correctly.

## Definition of Done

Deterministic unit tests, documentation, changelog.
