# SDD-011 --- Category Management

## Objective

Let users customize the category catalog of a space (FR-029, FR-030,
DR-017 to DR-019).

## Dependencies

v0.1.0.

## Scope

-   Create categories (with kind) and subcategories.
-   Rename categories and subcategories.
-   Archive and unarchive: archived items are hidden from new selections
    and remain displayed on existing transactions.
-   Delete permanently only when never used by any transaction
    (including soft-deleted ones); otherwise the API requires archiving.
-   Category management screen per space.
-   Changes are audited.

## Non-scope

Reordering, moving subcategories between categories, historical
reclassification (FR-031), merge of categories.

## Acceptance

-   New category appears for transactions of its kind.
-   Renaming updates how existing transactions display it.
-   Archived category is not offered in the transaction form but existing
    transactions keep it; editing such a transaction keeps it valid
    unless the user changes it.
-   Deleting a used category is rejected (`409 CATEGORY_IN_USE`).
-   Sibling names stay unique; kind cannot change after creation.

## Definition of Done

Migration, OpenAPI, tests, docs, current state, changelog.
