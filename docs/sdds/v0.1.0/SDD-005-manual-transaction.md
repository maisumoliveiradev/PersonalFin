# SDD-005 --- Manual Income and Expense

## Objective

Allow a user to manually register the first financial transaction.

## Dependencies

SDD-004 complete.

## Required fields

-   type: Income or Expense;
-   description;
-   amount;
-   financial date;
-   category.

Financial Space comes from active context. Initial status may default to
Paid/Received. Currency may use the initial configured/default context
until multi-currency is introduced.

## Scope

-   Transaction model;
-   safe money representation;
-   create use case/API;
-   minimal Web/Mobile form according to chosen platform structure;
-   validation;
-   authorization;
-   category ownership validation.

## Non-scope

Recurrence, cards, installments, tags, attachments, notes, links, split
transactions, multi-currency UI, bulk editing.

## Acceptance

-   User creates Income.
-   User creates Expense.
-   Invalid/zero/unsupported amounts are rejected according to domain
    validation.
-   A category from another space cannot be used.
-   Monetary value round-trips without float corruption.
-   Financial date round-trips without timezone shift.

## Definition of Done

Tests cover money/date/domain validation; OpenAPI updated; migration
included; current state/changelog updated.
