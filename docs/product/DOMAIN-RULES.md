# DOMAIN-RULES.md

## Purpose

Authoritative financial-domain rules. When implementation behavior could
change financial meaning, this document takes precedence over
convenience.

## Money

**DR-001** Never use binary floating point for monetary arithmetic.

**DR-002** Persist money using a precise representation appropriate to
the currency, preferably integer minor units or an equivalent precise
money type.

**DR-003** Currency metadata must support currencies with different
minor-unit rules.

**DR-004** Multi-currency records preserve original amount, original
currency, and the historical conversion rate applied.

## Financial Spaces

**DR-005** Every financial record belongs to a Financial Space unless
explicitly defined as global.

**DR-006** Each Financial Space has exactly one Owner.

**DR-007** Records in shared spaces belong to the space, not their
creator.

**DR-008** Removing a member does not remove records created by that
member.

**DR-009** The Owner must transfer ownership before leaving a shared
space that still has other members.

## Transactions

**DR-010** Transaction types are Income and Expense.

**DR-011** Initial transaction status is Pending or Paid/Received.

**DR-012** Every transaction has one primary category and at most one
subcategory.

**DR-013** Tags are many-to-many labels and do not split monetary value.

**DR-014** Split transactions are outside the initial model.

**DR-015** A transaction uses one primary financial calendar date. The
date may be edited and the change is auditable.

**DR-016** Payment method is not required for ordinary non-card expenses
in the initial model.

## Categories

**DR-017** A used category/subcategory cannot be destructively removed
in a way that breaks history.

**DR-018** Used classifications are archived when removed from future
selection.

**DR-019** Never-used classifications may be permanently deleted when
safe.

**DR-020** Reclassification must explicitly distinguish forward-only
changes from historical reclassification.

**DR-072** *(Proposed in SDD-004; accepted on 2026-09-24 under the
project owner's delegation. Enforced by the API and database since
SDD-005.)*
Every category has a kind, Expense or Income, and a transaction may only
use a category (and subcategory) of its own type. A subcategory has the
same kind and Financial Space as its parent, and classification has at
most two levels.

**DR-073** *(SDD-011.)* An archived category or subcategory is not
offered for new classification, but transactions that already use it
keep it and can still be edited without changing it. A category can be
permanently deleted only if no transaction (including soft-deleted ones)
uses it and it has no subcategories. A category's kind never changes
after creation.

## Consolidated Balance

**DR-021** The system does not require individual bank-account balances
as the primary balance model.

**DR-022** Each Financial Space owns its consolidated balance history.

**DR-023** A consolidated balance entry is an observed snapshot, not an
Income/Expense transaction.

**DR-024** New snapshots append history and never overwrite previous
snapshots.

**DR-025** Projection must not be presented as observed balance.

**DR-074** *(SDD-014.)* The balance reminder is due when the space has
no snapshot, or when the calendar days between the latest observed date
and today reach the configured frequency: every app start (unless a
balance for today exists), daily, every N days (1--90; default 7), or
never. The setting belongs to each user in each space. "Later" hides the
reminder until the next app start.

## Realized, Forecast, Projection

**DR-026** Realized represents financial events that have actually
occurred according to their domain status.

**DR-027** Forecast represents known/scheduled events that have not yet
occurred.

**DR-028** Projection is a calculated future position derived from
observed balance plus expected financial movements.

**DR-029** UI and reports must visually/semantically distinguish these
concepts.

## Recurrence

**DR-030** A recurrence defines a series; occurrences remain
independently editable.

**DR-031** Editing one occurrence must not silently rewrite all other
occurrences.

**DR-032** Future recurrence editing may offer: this occurrence, this
and following, or whole series.

**DR-033** Recurrences may be indefinite or end on a configured date.

**DR-034** Non-business-day adjustment is configured per recurrence.

**DR-075** *(SDD-018; decided under delegation.)* Recurrences repeat
monthly, weekly, or yearly. Monthly series use the start day, or the last
day of shorter months; yearly series on 29 February use 28 February in
non-leap years. Each occurrence keeps its scheduled date and receives a
financial date adjusted by the series' non-business-day rule
(`docs/product/BUSINESS-DAYS.md`). Occurrences are created Pending.

## Cards and invoices

**DR-035** A card purchase counts as expense in the month of the invoice
to which it belongs.

**DR-036** Invoice payment is settlement of already-recorded card
expenses and must not create a duplicate expense.

**DR-037** Invoice assignment is calculated from card closing
configuration but may be manually overridden.

**DR-038** An individual invoice may override default closing/due dates
without changing card defaults.

**DR-039** Partial invoice payment leaves an outstanding invoice amount.

**DR-040** Interest/fees may be represented as separate expenses rather
than inferred automatically.

## Installments

**DR-041** Installment purchase creation receives total value,
installment count, and first invoice/reference.

**DR-042** Generated installments preserve their relationship to the
original purchase.

**DR-043** Cancelling future installments does not erase realized
installments.

## Debts

**DR-044** Debt/loan is a separate domain concept from recurring expense
and card installment purchase.

**DR-045** Initial debt tracking is value/progress based and does not
require SAC/Price interest modeling.

**DR-046** Early-amortization scenarios are simulations until explicitly
confirmed.

**DR-047** Simulation must not mutate real debt or transaction data.

## Goals

**DR-048** Goals may be global or Financial-Space scoped.

**DR-049** Goal progress is manually maintained in the initial model.

**DR-050** Goal accumulated value does not automatically reduce
projected available balance.

## Dates and time

**DR-051** Financial dates are calendar dates and must not shift across
timezone conversions.

**DR-052** Audit/security/technical events are instants and should be
stored as UTC timestamps.

**DR-053** User timezone controls display and time-based notifications
where applicable.

## Audit and deletion

**DR-054** Relevant edits preserve who changed what and when.

**DR-055** Important financial deletion is soft deletion unless a
specific retention process authorizes permanent deletion.

**DR-056** Restoration is auditable.

**DR-057** Audit history remains while the account exists, subject to
final account-retention/deletion policy.

## Imports

**DR-058** Imports must never silently reinterpret ambiguous financial
meaning.

**DR-059** Import follows Read → Validate → Preview → Resolve → Confirm
→ Import.

**DR-060** Duplicate detection produces candidates; it does not silently
discard data.

**DR-061** After validated initial spreadsheet migration, the
application becomes the official source of truth.

## Synchronization

**DR-062** Safe non-conflicting field changes may merge automatically.

**DR-063** Same-field concurrent conflicts require explicit resolution.

**DR-064** Delete-versus-edit conflicts require explicit resolution.

**DR-065** Synchronization must not silently discard meaningful
financial changes.

## Metrics

**DR-066** Each built-in metric has one canonical definition.

**DR-067** The same metric definition applies across Web, Mobile,
exports, and reports.

**DR-068** Custom metric expressions must be validated and cannot
execute arbitrary code.

## AI

**DR-069** Initial AI/OCR use is objective document-data extraction.

**DR-070** Extracted data requires user review before persistence.

**DR-071** AI must not silently make subjective financial
classifications in the initial scope.
