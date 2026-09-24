# SDD-021 --- Monthly Projection

## Objective

Show the projected month-end balance, clearly distinguished from
realized and forecast values (FR-037, FR-038, FR-039, DR-025, DR-028,
DR-029).

## Scope

-   Metric M-008 "Saldo projetado" in `docs/product/METRICS.md` (formula
    in `v0.3.0/README.md`), computed by the API for a month.
-   Dashboard shows Realized, Forecast, and Projection as separate,
    labeled groups; the projection explains its base observation.
-   Projection for the next 6 months (list of month-end projections).

## Non-scope

Charts, scenarios, goals, cards.

## Acceptance

-   Exact values for scenarios with observations before and inside the
    month, overdue pending items, and deleted items.
-   No projection is shown without an observed balance.
-   Projection is never labeled as observed.

## Definition of Done

Metric catalog, OpenAPI, tests, docs, changelog.
