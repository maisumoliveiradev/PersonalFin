# ADR-0003 --- Safe Monetary Representation

## Status

Accepted

## Context

Financial arithmetic cannot tolerate binary floating-point rounding
errors and the product will support multiple currencies.

## Decision

Represent monetary values using integer minor units or an equivalent
precise Money abstraction. Never use binary floating point as the
authoritative monetary representation.

Currency metadata determines minor-unit behavior.

## Consequences

-   Arithmetic is deterministic.
-   Serialization and database schemas must preserve precision.
-   Formatting is a presentation concern.
-   Multi-currency conversion must explicitly define rounding.
