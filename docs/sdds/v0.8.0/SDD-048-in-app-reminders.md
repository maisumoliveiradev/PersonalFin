# SDD-048 --- In-App Reminders

## Objective

Remind users in the app about upcoming and overdue commitments with
configurable timing (FR-070 in-app channel, FR-071, DR-095).

## Scope

-   Database: per-user, per-space `reminder_setting` (offsets and kinds)
    and `reminder_dismissal`.
-   Domain: reminder stage from days until due and the chosen offsets.
-   API:
    - reminder settings (`view`, personal);
    - the current reminders for a given date: pending transactions, open
      invoices, debt installments, and a negative projected month-end
      balance;
    - dismissing a reminder stage.
-   Client:
    - a "Lembretes" section on the space screen, with dismiss;
    - a settings screen.

## Non-scope

Push notifications (pending owner decision), email.

## Acceptance

-   Reminders follow the chosen offsets.
-   A dismissed reminder comes back at its next offset.
-   Settings are personal.

## Definition of Done

Migration, OpenAPI, domain and API tests, journey, docs.
