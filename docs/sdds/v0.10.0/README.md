# v0.10.0 --- Multi-Currency

Drafted by the AI agent on 2026-09-25 under the project owner's
delegation. Sources: `ROADMAP.md` (v0.10.0), FR-079 to FR-082, DR-001 to
DR-004, ADR-0003, and `PRODUCT-VISION.md` section 22. Decisions for owner
review are listed here.

## Sequence

1.  `SDD-055-foreign-currency-transactions.md`
2.  `SDD-056-release-validation.md`

## Decisions for owner review

-   **Representation (ADR-0017, DR-098):**
    - `amountMinor` stays the base-currency amount (BRL), so every
      metric, projection, card, and report keeps its definition.
    - A transaction recorded in another currency also stores its
      original amount, original currency, the applied rate (a decimal
      with up to 10 places, never a float), and the rate source.
    - Conversion is exact integer arithmetic, rounding half away from
      zero.
    - Later rate changes never alter a recorded transaction (DR-004).
-   **Rates:** manual rates per space, append-only, with a validity
    date.
    - A foreign transaction uses the rate typed in the form, or the
      latest rate on or before its date.
    - Without either, the API refuses (`EXCHANGE_RATE_REQUIRED`); no rate
      is guessed.
-   **Currencies:** BRL, USD, EUR, GBP, ARS, CAD, CHF, CLP, and JPY
    (CLP and JPY without cents).
-   **Base currency (TD-013):** stays BRL. FR-081 asks for a configurable
    base currency, but many screens and modules assume BRL formatting,
    and changing the base of a space with history would need a
    re-conversion policy. This is recorded as debt instead of being done
    halfway.
-   **Automatic rates --- pending owner decision:** FR-082 asks for
    automatic daily rates from an external provider. That needs the
    owner to choose a provider (and accept its terms and any costs).
    Rates carry a `source` (`manual` or `provider`) so a provider can be
    added without changing the model.
-   **Limits:** installments and recurrences stay in the base currency.
    Foreign-currency changes need a connection (conversion happens on
    the server). Imports read base-currency amounts.

## Out of scope for v0.10.0

- Automatic rates (pending owner decision).
- A configurable base currency (TD-013).
- Foreign-currency installments, recurrences, debts, goals, and imports.
