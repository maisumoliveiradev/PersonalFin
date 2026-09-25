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
-   **Card purchases (DR-035, DR-079):** belong to period `M` when their
    invoice's reference month is `M`, whatever the purchase date. They
    are Realized when their invoice is fully paid and Forecast otherwise
    (DR-081). Invoice payments are never expenses. Card purchases enter
    M-008 only through their invoices.

## Catalog

| ID | Name (pt-BR) | Formula | Notes |
|---|---|---|---|
| M-001 | Receitas realizadas | Σ amount of Income, Paid, in M | |
| M-002 | Despesas realizadas | Σ amount of Expense, Paid, in M | |
| M-003 | Resultado realizado | M-001 − M-002 | May be negative. |
| M-004 | Receitas previstas | Σ amount of Income, Pending, in M | Forecast, not realized. |
| M-005 | Despesas previstas | Σ amount of Expense, Pending, in M | Forecast, not realized. |
| M-006 | Despesas realizadas por categoria | M-002 grouped by top-level category | Subcategories roll up into their category. Sorted by amount (desc), then name. Categories with zero are omitted. Archived categories are included. |
| M-008 | Saldo projetado (fim do mês) | Let B be M-007 (observed on date d). M-008 = B + Σ(income − expense) of transactions other than card purchases dated after d and before the end of M (any status) + Σ(income − expense) of such Pending transactions dated on or before d − Σ over card invoices due before the end of M of max(total − payments dated before the end of M, 0) − Σ invoice payments dated after d and before the end of M | A calculation, never an observed value (DR-025, DR-028). Paid transactions dated on or before d are assumed to be reflected in B. Card purchases move cash only through their invoice; payments on or before d are assumed to be reflected in B. Null when M-007 is null. |
| M-009 | Evolução mensal | For each month of a range (1 to 24 months): M-001, M-002, M-003, and M-007 of that month | Each value equals the dashboard value of its month. `GET .../analytics/evolution`. |
| M-010 | Comparação de períodos | For month M: M-001 to M-005 of M against month M − 1 and month M − 12; difference = value(M) − value(base); percentage change = difference × 100 / \|value(base)\| in tenths of a percent, rounded half away from zero | Percentage is null when the base is zero. Differences are exact; rounding applies only to the percentage. `GET .../analytics/comparison`. |
| M-011 | Despesas realizadas por categoria no período | M-002 over a range of 1, 3, 6, or 12 months grouped by top-level category, with subcategory amounts (null for none), share of the range total in tenths of a percent (rounded half away from zero), and the amount of the previous range of equal length | Categories add up exactly to the range total. Card purchases count in their invoice month and when their invoice is paid. `GET .../analytics/breakdown`. |
| M-012 | Despesas realizadas por tag | M-002 over the same range grouped by tag; each transaction counts in full under each of its tags | Tag amounts may add up to more than the total (DR-013). Share uses the range total of M-011. |
| M-007 | Saldo observado | The balance snapshot with the latest observed date ≤ last day of M (ties: latest recording instant) | An observation entered by the user (DR-023), never calculated from transactions and never a projection (DR-025). Null when no snapshot exists up to M. |

## Presentation (SDD-015, SDD-021)

The space screen shows M-001 to M-006 for the selected month in the
"Resumo do mês" card, with Realized and Forecast (Pendente) in separate
groups (DR-029). M-007 is shown in that card only for past months; for
the current month the "Saldo observado" card shows the latest balance.
M-008 is shown in its own "Projeção" group with its base and components
(including open card invoices),
and the space screen lists M-008 for the next six months.

The "Análises" screen (SDD-030) shows M-010 for the selected month and
M-009 for the twelve months ending in it, with proportional bars, and
M-011/M-012 for 1, 3, 6, or 12 months ending in it (SDD-031).

## Changing a metric

A change to a definition is a product decision: update this catalog,
the API implementation, and its tests together, and record it in the
changelog.
