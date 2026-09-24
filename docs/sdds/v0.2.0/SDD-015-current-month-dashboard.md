# SDD-015 --- Basic Current-Month Dashboard

## Objective

Show the essential numbers of the current month with documented metric
definitions (FR-061, FR-064, DR-025 to DR-029, DR-066).

## Dependencies

SDD-009, SDD-013.

## Scope

-   Metric catalog document (`docs/product/METRICS.md`) with meaning,
    formula, data source, and filters for each metric.
-   Metrics for a month in a space: realized income, realized expenses,
    realized net, forecast income, forecast expenses, expenses by
    category (realized), and current observed balance with its date.
-   Dashboard section at the top of the space screen with month
    navigation.

## Non-scope

Charts, comparisons, projection, personalization, experience profiles.

## Acceptance

-   Values match the metric definitions exactly (integer minor units).
-   Deleted transactions are excluded.
-   Observed balance is labeled as observed, never as projection.

## Definition of Done

Metric catalog, OpenAPI, tests, docs, current state, changelog.
