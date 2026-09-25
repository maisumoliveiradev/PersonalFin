# SDD-045 --- Debts and Loans

## Objective

Track debts and loans separately from recurring expenses and card
installments (FR-055, FR-056, DR-044, DR-045, DR-092).

## Scope

-   Database: `debt` and `debt_payment` (soft delete); audit entity types
    `debt` and `debt_payment`.
-   Domain: debt summary with paid and remaining installments,
    outstanding balance, progress, next due date, and last-installment
    amount.
-   API:
    - list, create, view, and edit debts (`plan`), including archive;
    - record and remove payments (`record`);
    - payments cannot exceed the outstanding balance.
-   Client: "Dívidas" screen with a list and progress, a form, and a debt
    screen with payments.

## Non-scope

Simulation (SDD-046), interest, links to transactions.

## Acceptance

-   Outstanding balance and progress are exact in minor units.
-   A payment larger than the outstanding balance is rejected.
-   Every change is audited.
-   Members without the permission get 403.

## Definition of Done

Migration, OpenAPI, unit, integration, and permission-matrix tests,
journey, docs, changelog.
