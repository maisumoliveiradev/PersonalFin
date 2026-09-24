# METRICS.md

Canonical definitions of built-in financial metrics (FR-064, DR-066,
DR-067). Every surface (Web, Android, iOS, exports, reports) must use
these definitions; the API computes them in one place
(`GET /financial-spaces/{spaceId}/dashboard`).

## Common rules

-   **Scope:** one Financial Space.
-   **Period:** one calendar month `M` of financial dates (DR-051):
    `financialDate >= first day of M` and `< first day of M + 1`. No
    timezone conversion is involved.
-   **Excluded:** soft-deleted transactions (SDD-009).
-   **Currency:** amounts are integer minor units of the space currency
    (BRL until multi-currency). Sums use exact integer arithmetic.
-   **Direction:** transaction amounts are always positive; the type
    (Income/Expense) gives the direction.
-   **Realized** = status Paid/Received (DR-026). **Forecast** = status
    Pending (DR-027).

## Catalog

| ID | Name (pt-BR) | Formula | Notes |
|---|---|---|---|
| M-001 | Receitas realizadas | Σ amount of Income, Paid, in M | |
| M-002 | Despesas realizadas | Σ amount of Expense, Paid, in M | |
| M-003 | Resultado realizado | M-001 − M-002 | May be negative. |
| M-004 | Receitas previstas | Σ amount of Income, Pending, in M | Forecast, not realized. |
| M-005 | Despesas previstas | Σ amount of Expense, Pending, in M | Forecast, not realized. |
| M-006 | Despesas realizadas por categoria | M-002 grouped by top-level category | Subcategories roll up into their category. Sorted by amount (desc), then name. Categories with zero are omitted. Archived categories are included. |
| M-007 | Saldo observado | The balance snapshot with the latest observed date ≤ last day of M (ties: latest recording instant) | An observation entered by the user (DR-023), never calculated from transactions and never a projection (DR-025). Null when no snapshot exists up to M. |

## Presentation (SDD-015)

The space screen shows M-001 to M-006 for the selected month in the
"Resumo do mês" card, with Realized and Forecast (Pendente) in separate
groups (DR-029). M-007 is shown in that card only for past months; for
the current month the "Saldo observado" card shows the latest balance.

## Changing a metric

A change to a definition is a product decision: update this catalog,
the API implementation, and its tests together, and record it in the
changelog.
