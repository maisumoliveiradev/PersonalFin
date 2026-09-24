# SDD-006 --- Transaction List

## Objective

Make the v0.1.0 vertical slice observable by allowing users to view
transactions in the active Financial Space.

## Dependencies

SDD-005 complete.

## Scope

-   list transactions for active space;
-   minimal useful ordering;
-   display type, description, amount, date, category, status;
-   empty/loading/error states;
-   strict authorization/isolation.

## Non-scope

Advanced search, bulk edit, edit/delete, dashboard, pagination
sophistication beyond what current dataset requires, analytics.

## Acceptance

-   Newly created transaction appears in the active space.
-   Transactions from inaccessible spaces never appear.
-   Empty state is clear.
-   Money/date formatting follows locale without changing stored
    meaning.

## Definition of Done

Relevant tests pass; accessibility basics applied; current
state/changelog updated.
