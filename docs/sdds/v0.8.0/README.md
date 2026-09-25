# v0.8.0 --- Debts, Goals, and Reminders

Drafted by the AI agent on 2026-09-25 under the project owner's
delegation. Sources: `ROADMAP.md` (v0.8.0), FR-055 to FR-060, FR-070,
FR-071, DR-044 to DR-050, and `PRODUCT-VISION.md` sections 12, 13, and
18. Decisions the documents left open are listed here for owner review.

## Sequence

1.  `SDD-045-debts.md`
2.  `SDD-046-amortization-simulation.md`
3.  `SDD-047-goals.md`
4.  `SDD-048-in-app-reminders.md`
5.  `SDD-049-release-validation.md`

## Decisions for owner review

-   **Debts (DR-092):** a debt belongs to a space. It has:
    - a name;
    - an original amount;
    - a planned number of installments;
    - the current installment amount;
    - the first due date.

    Payments (regular installment or prepayment) are recorded on the
    debt. From them the app computes:
    - the paid and remaining installments;
    - the outstanding balance;
    - progress;
    - the next due date.

    Interest is not modeled (DR-045). A payment cannot exceed the
    outstanding balance. Payments can be removed, which is audited.
-   **Debts and cash flow (DR-092):** recording a debt payment does not
    create a transaction, and transactions do not pay debts. Cash
    leaving the account is still recorded as a transaction (a recurrence
    works well), so nothing is counted twice and every metric keeps its
    definition.
-   **Simulation (DR-093):** a prepayment simulation shows the outcome
    for both modes:
    - reduce the term, keeping the installment amount;
    - reduce the installment, keeping the number of installments.

    Nothing is stored. Confirming records a prepayment and updates the
    plan in one audited change (DR-046, DR-047).
-   **Goals (DR-094):**
    - A goal has a name, a target, a manually updated accumulated
      amount, and an optional target date.
    - Every accumulated-amount update is kept in an append-only history.
    - A space goal is visible to the space's members, and editing it
      needs `plan`. It is audited in the space history.
    - A global goal belongs only to its creator. It is not in any space's
      audit history; its progress history is its record.
    - Goals never change projections (DR-050).
-   **In-app reminders (DR-095):**
    - Each user chooses, per space, how many days ahead to be reminded:
      on the day, 1, 3, and 7 days before. The default is on the day and
      3 days before.
    - They also choose which kinds to receive: pending income and
      expenses, card invoices, debt installments, and a negative
      projected balance for the current month.
    - A reminder appears at the earliest chosen offset and stays until
      the due date passes. Overdue pending items stay as overdue.
    - Dismissing a reminder hides it until its next offset.
-   **Push notifications --- pending owner decision:** push needs Expo's
    push service with FCM (Android) and APNs (iOS). It is a hosted
    service that sends notifications, and the owner has not authorized
    one yet. v0.8.0 delivers in-app reminders only. Push will reuse the
    same reminder computation once authorized.

## Out of scope for v0.8.0

- Push notifications (pending owner decision).
- Interest and SAC/Price amortization.
- Linking debt payments to transactions.
- Reminders on other devices while the app is closed.
