# SDD-012 --- Basic Transaction Filters and Search

## Objective

Let users find transactions quickly (FR-069: simple by default,
expandable).

## Dependencies

SDD-009.

## Scope

-   Month selector (default: current month) on the transaction list.
-   Optional filters: type, status, category, and text search in
    description (case-insensitive).
-   Cursor pagination for results beyond one page.

## Non-scope

Tags, saved filters, cross-space search, advanced query builder.

## Acceptance

-   Each filter narrows the list correctly and filters combine (AND).
-   Month boundaries use financial dates (no timezone shift).
-   Pagination returns every matching transaction exactly once.

## Definition of Done

OpenAPI, tests, docs, current state, changelog.
