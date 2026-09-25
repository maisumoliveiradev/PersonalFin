# SDD-030 --- Evolution and Comparisons

## Objective

Show how the space evolves month by month and compare a month with the
previous month and the same month of the previous year (FR-061, FR-063).

## Scope

-   API: evolution of M-001 to M-003 and M-007 for up to 24 months;
    comparison of M-001 to M-005 for a month against the previous month
    and the same month a year earlier.
-   Metric catalog: new entries for evolution and comparison
    (`METRICS.md`).
-   Client: "Análises" screen with month-by-month rows and proportional
    bars, and the comparison of the selected month.

## Non-scope

Category/tag breakdown (SDD-031), personalization (SDD-032).

## Acceptance

-   Values equal the dashboard values of each month to the cent;
    percentage change is null when the base is zero.

## Definition of Done

OpenAPI, tests with exact values, journey, docs, changelog.
