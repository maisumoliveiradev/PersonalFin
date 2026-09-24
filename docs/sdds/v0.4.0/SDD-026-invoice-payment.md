# SDD-026 --- Invoice Payment

## Objective

Settle invoices with full or partial payments without creating
duplicate expenses (FR-047, FR-053, DR-036, DR-039).

## Scope

-   API: record and remove invoice payments (amount, date); invoice
    outstanding amount and state (open, partially paid, paid);
    audited.
-   Metrics: purchases of fully paid invoices become Realized; M-008
    treats payments as cash outflows and subtracts only outstanding
    amounts.
-   Client: "Pagar fatura" with the outstanding amount suggested and
    partial amounts allowed; payment list on the invoice screen.

## Non-scope

Automatic interest or fees (DR-040), bank reconciliation.

## Acceptance

-   A payment never appears as an expense.
-   A partial payment leaves the exact outstanding amount.

## Definition of Done

Migration, OpenAPI, tests with exact values, journey, docs, changelog.
