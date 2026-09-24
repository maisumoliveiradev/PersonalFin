# SDD-018 --- Recurring Income and Expense Series

## Objective

Let users register recurring income and expenses (FR-040, FR-042,
FR-043, DR-030, DR-033, DR-034).

## Dependencies

SDD-017.

## Scope

-   `recurrence_series` table: space, type, description, amount,
    category/subcategory, start date, frequency (monthly, weekly,
    yearly), optional end date, non-business-day rule, author, version,
    ended flag.
-   Occurrences are transactions with `recurrence_series_id` and
    `occurrence_date` (the unadjusted scheduled date, unique per series);
    their financial date is the business-day-adjusted date.
-   Create a series and materialize occurrences through the horizon;
    endpoint to extend materialization up to a given month (max 60
    months ahead); list series of a space.
-   Client: "Repetir" option in the new-transaction form; series list
    screen; list rows show a recurrence indicator.

## Non-scope

Editing series (SDD-019), custom intervals, installments, cards.

## Acceptance

-   Creating a monthly series on the 31st yields occurrences on each
    month's last day; weekly and yearly series follow their calendars.
-   Occurrences on non-business days follow the chosen rule.
-   Series with an end date never create occurrences after it.
-   Extending twice creates no duplicates.
-   Occurrences are Pending and appear in list, filters, and forecast.

## Definition of Done

Migration, OpenAPI, domain and integration tests, docs, changelog.
