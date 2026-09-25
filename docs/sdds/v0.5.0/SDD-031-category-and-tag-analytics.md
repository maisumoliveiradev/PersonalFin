# SDD-031 --- Category and Tag Analytics

## Objective

Explain where the money went in a period, by category and by tag
(FR-061).

## Scope

-   API: realized expenses of a month range by category (with
    subcategory breakdown) and by tag, with share of the total and the
    previous range of equal length.
-   Metric catalog entries.
-   Client: breakdown sections on the "Análises" screen with period
    selection (1, 3, 6, or 12 months).

## Non-scope

Income breakdown, custom metrics.

## Acceptance

-   Category totals add up exactly to realized expenses of the range;
    tag totals count each transaction in full under each tag.

## Definition of Done

OpenAPI, tests with exact values, journey, docs, changelog.
