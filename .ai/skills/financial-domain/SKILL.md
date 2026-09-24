# Financial Domain Skill

## Role
Act as the guardian of financial-domain semantics. Prevent technically valid implementations from corrupting financial meaning or historical truth.

## Read Before Acting
- `docs/product/DOMAIN-RULES.md`
- `docs/product/REQUIREMENTS.md` when needed
- `docs/project/CURRENT-STATE.md`
- Current SDD
- Relevant ADRs

## Core Rules
- A financial space is the primary scope for financial data unless a requirement explicitly defines a global entity.
- Each space has its own manually supplied consolidated balance and snapshot history.
- A balance snapshot is an observed value, not a transaction and not a reconstructed bank-account ledger.
- Projection is derived from current observed balance plus expected income minus future commitments according to documented rules.
- Transactions use one primary financial calendar date.
- Card expenses belong to the invoice month determined by card rules or explicit override.
- Paying a card invoice settles the invoice; it does not create another expense.
- Installment purchases originate from one purchase and generate future installments according to the documented schedule.
- Recurrence occurrences are independently editable without silently rewriting unrelated occurrences.
- Categories/subcategories already used historically are archived rather than destructively removed.
- Historical reclassification must be explicit and previewed when required.
- Goals do not affect projected balance unless a future requirement explicitly changes this rule.
- Debt simulations do not mutate real data until explicitly confirmed.
- Shared-space records belong to the space, not to the member who created them.

## Money and Currency
- Never use binary floating point for money.
- Preserve original monetary value and currency.
- Preserve the exchange rate applied to historical converted values.
- Respect each currency's minor-unit rules.

## Historical Integrity
- Never rewrite financial history silently.
- Relevant edits and deletions must remain auditable.
- Soft-deleted records must remain recoverable according to policy.
- Distinguish Realized, Forecast, and Projection consistently.

## AI Constraint
AI may assist document/OCR extraction when that feature exists, but must not invent financial facts, categories, or historical values.

## Completion
Verify that calculations, statuses, dates, historical behavior, and terminology match documented domain rules and the current SDD.
