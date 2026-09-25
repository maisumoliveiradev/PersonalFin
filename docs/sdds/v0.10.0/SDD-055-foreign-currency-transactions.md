# SDD-055 --- Foreign-Currency Transactions and Exchange Rates

## Objective

Record transactions in other currencies while preserving the original
amount, currency, and applied rate, and convert them exactly to the
base currency (FR-079, FR-080, FR-082 manual override, DR-004, DR-098,
ADR-0017).

## Scope

-   Domain: currency catalog with minor units, rate parsing and
    normalization, and exact conversion with explicit rounding.
-   Database:
    - original amount, currency, rate, and source columns on
      `financial_transaction`, with a consistency check;
    - the append-only `exchange_rate` table.
-   API:
    - `foreign` on transaction create and update;
    - `original` in responses;
    - exchange rates: list, latest on a date, and record;
    - export columns for the original amount.
-   Client:
    - currency, amount, and optional rate in the transaction form, with
      a conversion preview;
    - the original amount and rate on list rows;
    - a "Cotações" screen.

## Acceptance

-   Conversions are exact, and recorded rates never change later.
-   No conversion happens without a rate.
-   Changing a foreign transaction's base amount without its original
    amount is refused.

## Definition of Done

ADR-0017, migration, OpenAPI, domain, API, and integration tests,
journey, docs, TD-013.
