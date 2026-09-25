# ADR-0017 --- Multi-Currency Representation

## Status

Accepted (2026-09-25, SDD-055; decided by the AI agent under the project
owner's delegation, pending owner review)

## Context

FR-079 to FR-082 and DR-004 require transactions in several currencies,
with the original amount, the currency, and the historical rate
preserved. ADR-0003 requires integer money and explicit rounding.

Every metric, projection, invoice, and report is already defined over
`financial_transaction.amount_minor` in BRL (DR-066, DR-067).

## Decision

-   **Base amount:** `amount_minor` remains the amount in the space's
    base currency (BRL). All aggregations keep using it unchanged.
-   **Original amount:** a foreign-currency transaction also stores
    `original_amount_minor` (in the original currency's minor units),
    `original_currency`, `fx_rate`, and `fx_rate_source`.
    - `fx_rate` is `numeric(19,10)`: base units per one original unit.
    - A check constraint requires all four columns or none, and forbids
      the base currency as the original one.
-   **Conversion:** `convertToBase` in `packages/domain` computes
    `original × rate × 10^baseUnits / 10^originalUnits` with `BigInt`,
    rounding half away from zero. Rates travel as decimal strings,
    never as floats.
-   **Rates:** manual rates live in the append-only `exchange_rate` table
    (per space, with a validity date and a source). A transaction copies
    the rate it used, so later rates never change history (DR-004). An
    automatic provider can insert rates with `source = 'provider'` once
    the owner chooses one.

## Alternatives Considered

1.  **Store the original amount only and convert when reading.** Every
    metric would depend on rate lookups, and history would change
    whenever rates are corrected.
2.  **Float rates.** They violate DR-001 and ADR-0003.
3.  **Configurable base currency now.** It needs a re-conversion policy
    for existing data and BRL-independent formatting everywhere
    (TD-013).

## Consequences

-   No existing metric or module changes.
-   The client must send `foreign` (not `amountMinor`) to change a
    foreign transaction's amount. Changing only the base amount is
    refused with `FOREIGN_AMOUNT_REQUIRED`.
-   Foreign-currency changes need the server, so they are not queued
    offline.

## References

-   FR-079 to FR-082; DR-001 to DR-004; DR-098
-   ADR-0003, ADR-0011
-   SDD-055
