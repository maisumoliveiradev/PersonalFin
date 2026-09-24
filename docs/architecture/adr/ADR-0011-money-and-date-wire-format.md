# ADR-0011 --- Money and Financial Date Formats and Shared Domain Package

## Status

Accepted (2026-09-24, SDD-005)

## Context

ADR-0003 requires exact monetary representation (integer minor units or
equivalent), and ADR-0004 requires financial dates to be calendar dates
that never shift across timezones. SDD-005 introduces the first
monetary records, so the concrete representation must be fixed in the
database, the API contract, and both clients. Parsing the user's input
and formatting values are domain rules that Web, Android, iOS, and the
API must apply identically (DR-066/DR-067 spirit).

## Decision

-   **Database:** `amount_minor bigint` (`> 0`, `<= 99 999 999 999`) plus
    `currency char(3)`; the transaction type carries the direction, so
    amounts are always positive. Financial dates use the `date` type.
-   **Driver:** the `pg` type parser for `date` (OID 1082) returns the
    raw `YYYY-MM-DD` string. Dates are never turned into JavaScript
    `Date` objects, which would apply a timezone. `bigint` values arrive
    as strings and are converted with a safe-integer check.
-   **API contract:** `amountMinor` is a JSON integer in the currency's
    minor units (BRL: centavos). The maximum (99 999 999 999) is well
    below `Number.MAX_SAFE_INTEGER`, so JSON numbers are exact.
    `currency` is an ISO 4217 code decided by the server (BRL until
    multi-currency); requests cannot override it. `financialDate` is
    `YYYY-MM-DD` (`format: date`).
-   **Shared domain package** `packages/domain`, used by the API and the
    client:
    -   `parseAmountInput` converts user text (pt-BR `1.234,56`, en
        `1,234.56`) to minor units with string arithmetic only.
    -   `formatMoney` formats minor units without floating point or
        `Intl`, keeping output identical across JavaScript engines
        (Hermes, V8).
    -   `financialDateFromLocalClock` derives "today" from the device's
        local calendar day (never `toISOString`, which is UTC).
    -   `parseDisplayDate`/`formatDisplayDate` convert between
        `DD/MM/AAAA` and `YYYY-MM-DD` without timezones.
    -   Transaction types, statuses, and description rules.

## Alternatives Considered

1.  **Decimal strings in the API** (`"1234.56"`). Also exact, but they
    require decimal parsing on every client, and the number of minor
    units per currency would be implicit.
2.  **`numeric(14,2)` in PostgreSQL.** Exact, but ties the scale to two
    decimals and still needs care when converting to JavaScript.
3.  **`Intl.NumberFormat` for formatting.** Engine support differs
    (Hermes), and it takes JavaScript numbers.

## Consequences

-   Clients never perform floating-point arithmetic on money.
-   Adding a currency means adding metadata (minor units, symbol) in
    `packages/domain` and, for multi-currency, storing the applied rate
    (DR-004) in a later SDD.
-   Tests run the date-sensitive suites under several process timezones.

## References

-   SDD-005 --- Manual Income and Expense
-   ADR-0003, ADR-0004
-   DR-001 to DR-004, DR-051, FR-025, FR-026
