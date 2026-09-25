# SDD-029 --- Tags

## Objective

Let users label transactions with multiple custom tags (FR-032, DR-013).

## Scope

-   API: create, list, rename, archive/unarchive, and delete never-used
    tags per space (audited, version-checked); transactions accept and
    return up to 10 tag ids; list filter by tag.
-   Database: `tag` and `transaction_tag`.
-   Client: "Tags" management screen; tag selection in the transaction
    form; tags shown on list rows; tag filter.

## Non-scope

Tag analytics (SDD-031), tags on recurrences and installment purchases.

## Acceptance

-   Tags never change amounts or totals; archived tags stay on existing
    transactions and are not offered for new ones.
-   Other users cannot see or use a space's tags.

## Definition of Done

Migration, OpenAPI, unit and integration tests, journey, docs,
changelog.
