# SDD-020 --- Future Commitments

## Objective

Show what is still expected: pending income and expenses from today on
(roadmap: future commitments, DR-027).

## Scope

-   API: pending, non-deleted transactions with financial date from a
    start date over the next N days (7--365), plus overdue pending items
    (before today), grouped by date.
-   Client: "Próximos compromissos" screen with overdue section, totals of
    expected income and expenses, and quick status change.

## Non-scope

Notifications, projection (SDD-021).

## Acceptance

-   Paid and deleted items never appear; overdue pending items are
    listed separately; totals are exact.

## Definition of Done

OpenAPI, tests, docs, changelog.
