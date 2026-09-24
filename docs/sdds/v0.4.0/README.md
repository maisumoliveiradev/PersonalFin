# v0.4.0 --- Credit Cards

Drafted by the AI agent on 2026-09-24 under the project owner's
delegation, from `ROADMAP.md` (v0.4.0), FR-045 to FR-054, and DR-035 to
DR-043. Domain decisions the documents left open are listed here for
owner review.

## Sequence

1.  `SDD-023-cards-and-limits.md`
2.  `SDD-024-card-purchases-and-invoices.md`
3.  `SDD-025-installment-purchases.md`
4.  `SDD-026-invoice-payment.md`
5.  `SDD-027-card-limit-and-summary.md`
6.  `SDD-028-release-validation.md`

## Decisions for owner review

-   **Card configuration:** a card has a name, a closing day (1--31) and a
    due day (1--31); days beyond the length of a month use its last day.
    The limit is kept as a history of values with effective dates
    (FR-051); the current limit is the latest effective value up to
    today. Cards are archived, never deleted once used.
-   **Invoice identity:** an invoice is identified by its card and its
    reference month, which is the month of its due date ("fatura de
    outubro" is due in October).
-   **Default dates:** the closing date is the closing day of the month
    before the reference month when the due day is on or before the
    closing day, otherwise of the reference month itself. The due date
    is the due day of the reference month moved to the next business day
    (Brazilian national calendar, SDD-017). Closing dates are not moved.
    An invoice may override both dates without changing the card
    (DR-038).
-   **Assignment:** a purchase dated before an invoice's closing date
    belongs to the earliest invoice whose closing date is after the
    purchase date; a purchase made on the closing date goes to the next
    invoice. The user may pick another invoice (DR-037). The assignment
    is stored on the purchase, so later date overrides never move
    existing purchases.
-   **Purchases are transactions:** a card purchase is an Expense
    transaction linked to an invoice, with the usual category rules. The
    transaction list keeps showing it by purchase date.
-   **Metrics (DR-035):** card purchases count as expenses in the
    reference month of their invoice, not in the month of the purchase
    date. They are Realized when their invoice is fully paid and Forecast
    otherwise; this is derived from the invoice, so card purchases have
    no status of their own and cannot be toggled.
-   **Cash projection (M-008) and commitments:** a card purchase does not
    move cash; the invoice does. M-008 and the commitments screen use
    open invoice amounts at their due date instead of individual card
    purchases. Invoice payments are cash outflows that settle the
    invoice and are never expenses (DR-036).
-   **Installments (DR-041 to DR-043):** the total is split into equal
    installments in minor units; the remainder cents go to the first
    installment. Installment k goes to the invoice k − 1 months after
    the first invoice. Cancelling future installments moves those in
    unpaid invoices after a chosen invoice to the trash.
-   **Used and available limit (FR-050):** used = card purchases not
    deleted (including future installments) − payments; available =
    current limit − used, which may be negative.

## Out of scope for v0.4.0

Recurring charges on cards, interest and fees inferred automatically
(DR-040 keeps them as separate expenses), statement import, card
brands and virtual cards, sharing.
