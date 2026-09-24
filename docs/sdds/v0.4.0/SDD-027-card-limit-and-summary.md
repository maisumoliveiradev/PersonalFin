# SDD-027 --- Card Limit and Summary

## Objective

Show the known used and available limit of each card and a simple card
summary (FR-050, roadmap: card analytics).

## Scope

-   API: used and available limit per card (README decision); invoice
    totals of the last and next months per card.
-   Client: limit bar on the cards screen; invoice totals on the card
    screen.

## Non-scope

Charts, comparisons, category breakdown per card.

## Acceptance

-   Used limit counts future installments and subtracts payments; values
    are exact.

## Definition of Done

OpenAPI, tests, journey, docs, changelog.
