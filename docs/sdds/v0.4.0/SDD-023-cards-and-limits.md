# SDD-023 --- Cards and Limits

## Objective

Register the credit cards of a Financial Space with closing day, due day,
and a limit whose changes keep their effective-date history (FR-045,
FR-051).

## Scope

-   Domain (`packages/domain`): card day rules (1--31, clamped to the
    month length).
-   API: create, list, get, and edit cards (name, closing day, due day);
    archive/unarchive; record a limit change with effective date; list
    limit history. Changes are audited and version-checked (ADR-0012).
-   Database: `card` and append-only `card_limit_change`.
-   Client: "Cartões" screen per space (list, create, edit, archive) and a
    card screen with its current limit and limit history.

## Non-scope

Purchases and invoices (SDD-024), used/available limit (SDD-027).

## Acceptance

-   Limit changes never overwrite earlier values; the current limit is
    the latest effective value up to today.
-   Invalid days, blank names, and non-positive limits are rejected.
-   Other users cannot see or change the cards of a space.

## Definition of Done

Migration, OpenAPI, unit and integration tests, browser journey,
docs, changelog.
