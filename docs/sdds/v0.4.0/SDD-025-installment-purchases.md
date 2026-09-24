# SDD-025 --- Installment Purchases

## Objective

Create card purchases in installments from total value, count, and
first invoice, keeping their link to the original purchase (FR-049,
FR-054, DR-041 to DR-043).

## Scope

-   Domain: exact split of the total into installments.
-   API: installment purchase (2--48 installments) creating one card
    purchase per invoice, linked to a `card_installment_purchase`;
    cancel future installments after a chosen invoice.
-   Client: "Parcelar" in the card purchase form; installments shown as
    "3/10"; cancel remaining installments.

## Non-scope

Installments outside cards, interest.

## Acceptance

-   The installments add up exactly to the total.
-   Cancelling keeps installments of paid invoices and earlier invoices.

## Definition of Done

Migration, OpenAPI, tests, journey, docs, changelog.
