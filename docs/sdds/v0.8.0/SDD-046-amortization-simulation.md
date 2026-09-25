# SDD-046 --- Early-Amortization Simulation

## Objective

Let users see what a prepayment would change before committing to it
(FR-057, DR-046, DR-047, DR-093).

## Scope

-   Domain: simulate a prepayment in both modes. Reduce the term:
    same installment, fewer installments. Reduce the installment: same
    number of installments, smaller installment.
-   API:
    - a stateless simulation endpoint (`view`);
    - a confirmation endpoint (`record`) that records a prepayment and
      updates the plan atomically with optimistic concurrency;
    - the confirmation is audited.
-   Client:
    - a simulation panel on the debt screen that compares the current
      and simulated states;
    - confirming asks explicitly.

## Acceptance

-   Simulating never changes stored data.
-   Confirming changes the debt exactly as simulated.

## Definition of Done

Domain tests at rounding boundaries, API tests, journey, docs.
