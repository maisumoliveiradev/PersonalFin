# SDD-014 --- Balance Update Prompt

## Objective

Ask "Qual é o seu saldo hoje?" at a configurable frequency (FR-036).

## Dependencies

SDD-013.

## Scope

-   Per-user, per-space reminder setting: on app start, daily, every N
    days (1--90), or never.
-   In-app prompt on the space screen when due, with "record now" and
    "later" (dismiss until next app start).
-   Default: every 7 days; a space with no snapshot is always due unless
    set to never.

## Non-scope

Push notifications, email.

## Acceptance

-   Prompt appears exactly when due for each frequency.
-   Recording a snapshot clears the prompt.
-   Setting "never" hides it.

## Definition of Done

Migration, OpenAPI, tests (due-date rules in the domain package), docs,
current state, changelog.
