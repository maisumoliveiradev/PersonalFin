# SDD-024 --- Card Purchases and Invoices

## Objective

Record purchases on a card, assign them to invoices, and count them in
the invoice month (FR-046, FR-048, FR-052, DR-035, DR-037, DR-038).

## Scope

-   Domain: default closing/due dates for a reference month and default
    invoice for a purchase date (README decisions).
-   API: `card_invoice` created on demand (unique per card and reference
    month); transactions accept an optional card and invoice (Expense
    only); invoice list and detail with its purchases and total; invoice
    date overrides.
-   Metrics: card purchases count in the reference month of their
    invoice, as Forecast until SDD-026 adds payments; M-008 and the
    commitments screen use open invoice totals at their due date.
    Update `METRICS.md`.
-   Client: "Cartão" choice in the expense form with the suggested
    invoice and a way to pick another; invoice screen per card.

## Non-scope

Installments (SDD-025), payments (SDD-026).

## Acceptance

-   Purchases before, on, and after the closing date land in the
    expected invoice; overriding an invoice's dates does not move them.
-   A card purchase appears once in the metrics, in its invoice month.

## Definition of Done

Migration, OpenAPI, unit and integration tests with exact values,
journey, docs (DR-078), changelog.
