# SDD-019 --- Independent Occurrences and Series Changes

## Objective

Keep occurrences independently editable and allow controlled series
changes (FR-041, DR-030 to DR-032).

## Dependencies

SDD-018.

## Scope

-   Editing or deleting one occurrence marks it as individually modified
    and never affects others.
-   Edit series "from this occurrence on": description, amount, category,
    subcategory; applies to pending, unmodified occurrences on or after
    the chosen occurrence; audited.
-   End series: sets the end date and soft-deletes pending, unmodified
    occurrences after it.
-   Client: occurrence edit screen offers "Apenas este" (default) or
    "Este e os próximos"; series screen offers "Encerrar".

## Non-scope

Changing frequency or start date of an existing series; "whole series
including past".

## Acceptance

-   Editing one occurrence leaves siblings unchanged.
-   Series edit changes only future pending unmodified occurrences.
-   Paid or individually edited occurrences are never rewritten.
-   Ending keeps past and paid occurrences.

## Definition of Done

Tests for every rule, OpenAPI, docs, changelog.
