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

**DR-098** *(SDD-055; decided under delegation.)* A foreign-currency
transaction keeps its original amount, currency, and applied rate, and
counts in metrics with its base-currency amount:
- **Conversion:** original amount × rate, in exact decimal arithmetic,
  rounded half away from zero to the base currency's minor unit.
- **Rate choice:** the rate is the one typed by the user, or the latest
  recorded rate on or before the transaction date. With neither, the
  transaction is refused.
- **Stability:** recorded rates are append-only and never change
  existing transactions.
- **Editing:** a foreign transaction's amount is changed through its
  original amount, or by explicitly converting it to the base currency
  only.

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

**DR-083** *(SDD-029; decided under delegation.)* Tags belong to a
space and have unique names ignoring case (1 to 40 characters). A
transaction has at most 10 tags. Used tags are archived instead of
deleted; archived tags stay on their transactions and are not offered
for new ones. Tag changes on a transaction are audited. Installment
purchases and recurrence series do not carry tags yet.

**DR-084** *(SDD-032; decided under delegation.)* Dashboard
preferences belong to one user and one space: an experience profile
(Basic, Intermediate, or Advanced; default Advanced) and per-section
overrides. They change only what is displayed, never any value.

**DR-085** *(SDD-034; decided under delegation.)* Space permissions are
`view`, `record` (transactions, balance snapshots, invoice payments,
installment cancellation), `plan` (recurrences, cards, invoice dates),
`classify` (categories and tags), `manage_members`, and `view_audit`;
`view` is always included. Presets: Viewer (view), Contributor (view,
record), Administrator (all). Personal settings need only `view`. The
Owner holds every permission (ADR-0015).

**DR-086** *(SDD-035; decided under delegation.)* An invitation names
one email address and a permission set, is valid for 7 days, and is
used through a single-use secret link whose token is stored only as a
hash. Only a signed-in account with the invited email can accept it;
accepting creates one membership. Invitations can be cancelled; people
who already have access cannot be invited, and one email has at most one
pending invitation per space. Email delivery is pending (TD-011).

**DR-087** *(SDD-037; decided under delegation.)* Only the Owner can
transfer ownership, and only to an active member. In one transaction the
new Owner's membership ends, ownership moves, and the previous Owner
becomes a member with every permission (Administrator). The Owner
cannot leave or be removed until ownership is transferred (DR-009).

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

**DR-077** *(SDD-021; decided under delegation.)* The projected balance
at the end of a month starts from the latest observed balance dated up to
that month's end, adds every non-deleted transaction dated after the
observation date up to the month's end (income adds, expense subtracts,
any status), and adds Pending transactions dated on or before the
observation date (still expected). Paid transactions dated on or before
the observation date are assumed to be already reflected in it. Without
an observed balance there is no projection (M-008 in
`docs/product/METRICS.md`).

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

**DR-076** *(SDD-019; decided under delegation.)* Editing or deleting one
occurrence marks it as individually modified; later series changes never
touch it. "This and following" changes the series description, amount,
and category and applies them to Pending, non-deleted, unmodified
occurrences scheduled on or after the chosen occurrence; date, type, and
status changes are always per occurrence. Ending a series on a date
moves its Pending, unmodified occurrences scheduled after that date to
the trash; paid, edited, and earlier occurrences are kept.

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

**DR-078** *(SDD-023; decided under delegation.)* A card has a closing
day and a due day from 1 to 31; in months without that day, the last day
of the month is used. The card limit is an append-only history of values
with effective dates: the limit on a date is the latest value effective
on or before it (ties: latest recorded). Card names are unique per space,
ignoring case. Cards are archived rather than deleted.

**DR-079** *(SDD-024; decided under delegation.)* An invoice is
identified by its card and reference month, the month of its due date.
By default it closes on the card's closing day of the month before when
the due day is on or before the closing day, otherwise of the reference
month; it is due on the card's due day of the reference month moved to
the next business day. A purchase belongs by default to the earliest
invoice whose closing date is after the purchase date (a purchase on
the closing date goes to the next invoice); the user may choose an
invoice from the month before to two months after the purchase. The
assignment is stored, so later date overrides never move purchases.
Invoices are created when first needed with the card's days at that
time. Card purchases are Expense transactions without a status of their
own; commitments and the cash projection use their invoices instead.

**DR-080** *(SDD-025; decided under delegation.)* An installment
purchase (2 to 48 installments) keeps its total, count, purchase date,
and first invoice. The total is split into equal installments in minor
units with the remainder on the first; installment k is dated k − 1
months after the purchase (clamped to short months) and belongs to the
invoice k − 1 months after the first. Each installment is an independent
card purchase linked to the original purchase. Cancelling future
installments moves to the trash only the installments whose invoice is
after a chosen invoice month; earlier installments are kept (DR-043).

**DR-081** *(SDD-026; decided under delegation.)* Invoice payments are
recorded against one invoice with an amount and a payment date; they
never create expenses (DR-036) and cannot exceed the invoice's open
amount. A payment recorded by mistake can be removed (soft delete,
audited). An invoice is paid when its payments cover its total; its
purchases then count as Realized. Cancelling installments keeps those in
invoices that already have a payment.

**DR-082** *(SDD-027; decided under delegation.)* The known used limit
of a card is the unpaid part of all its invoices: every non-deleted
purchase, including future installments, minus payments. The available
limit on a date is the limit effective on that date minus the used
limit; it may be negative and is unknown when no limit is effective.

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

**DR-092** *(SDD-045; decided under delegation.)* A debt belongs to a
space and has a name, original amount, planned installment count,
current installment amount, and first due date. Payments (installment or
prepayment) are recorded on the debt and never exceed the outstanding
balance; the outstanding balance is the original amount minus active
payments, and paid installments are the recorded installment payments.
Interest is not modeled. Debt payments do not create transactions and
transactions do not pay debts; cash outflows are recorded as
transactions.

**DR-093** *(SDD-046; decided under delegation.)* A prepayment
simulation either keeps the installment amount and reduces the number of
remaining installments (the last one absorbs the difference) or keeps
the number of remaining installments and reduces the installment (the
last one absorbs the cents). Confirmation records a prepayment and the
new plan atomically.

## Goals

**DR-048** Goals may be global or Financial-Space scoped.

**DR-049** Goal progress is manually maintained in the initial model.

**DR-050** Goal accumulated value does not automatically reduce
projected available balance.

**DR-094** *(SDD-047; decided under delegation.)* A goal has a name,
target, accumulated amount, and optional target date. Space goals are
visible to members and changed with `plan`; global goals are visible
only to their owner. Each accumulated-amount update is kept in an
append-only progress history.

## Reminders

**DR-095** *(SDD-048; decided under delegation.)* In-app reminders are
personal per user and space:
- **Offsets:** chosen from on the day, 1, 3, and 7 days before. The
  default is on the day and 3 days before.
- **Kinds:** pending income and expenses, open card invoices, debt
  installments, and a negative projected month-end balance for the
  current month.
- **Stages:** a reminder appears at the largest chosen offset that
  covers the days left and moves to smaller offsets as the due date
  approaches. Past-due pending items are reminded as overdue (up to 90
  days back).
- **Dismissal:** dismissing hides the reminder until its next stage.

Reminders never change financial data.

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

**DR-096** *(SDD-050; decided under delegation.)* Imports keep the
original file and follow read, map, validate, preview, resolve, confirm.
Nothing ambiguous is guessed:
- **Dates and decimals:** date order and decimal separator are chosen by
  the user. Amounts are read as text and never rounded; more than two
  decimals is an error.
- **Sign:** the sign convention is chosen explicitly. A negative amount
  under any other convention is an error.
- **Type and status:** unknown type or status words are errors.
- **Categories:** unmatched categories use a fallback category chosen by
  the user, or make the row invalid.

A row with the same type, date, and amount as an active transaction or
an earlier row is a suspected duplicate and needs an import or skip
decision. Confirmed imports link their transactions to the batch and
can be undone by moving them all to the trash.

**DR-097** *(SDD-051 to SDD-053; decided under delegation.)* Exports
(CSV, XLSX, PDF) are reports of the data visible to the user and use the
canonical metric definitions. The portable backup is a separate,
versioned JSON document containing every accessible record, and is not
a report.

## Synchronization

**DR-062** Safe non-conflicting field changes may merge automatically.

**DR-063** Same-field concurrent conflicts require explicit resolution.

**DR-064** Delete-versus-edit conflicts require explicit resolution.

**DR-065** Synchronization must not silently discard meaningful
financial changes.

**DR-088** *(SDD-042; decided under delegation.)* Offline, users can view
data already loaded and create, edit, change the status of, or delete
transactions (including a single card purchase). Every other change
needs a connection. Offline changes are listed as not synchronized and
do not change metrics until the server accepts them (DR-066). A
transaction with a pending offline change cannot be changed again until
that change is synchronized or discarded.

**DR-089** *(SDD-043; decided under delegation.)* When an offline edit
meets a concurrent change, fields are compared against the version the
user edited: fields changed on only one side merge automatically; a
field changed on both sides to different values requires the user to
choose, per field, between their value and the current value.

**DR-090** *(SDD-043; decided under delegation.)* An offline edit of a
transaction deleted meanwhile asks whether to restore it and apply the
edit or discard the edit; an offline deletion of a transaction edited
meanwhile asks whether to delete it anyway or keep it. Every resolution
that writes to the record is audited with its context (automatic merge,
per-field choice, restore, or deletion after a concurrent edit); keeping
the current record writes nothing.

**DR-091** *(SDD-041; decided under delegation.)* Local data belongs to
one signed-in user. The local cache is removed at sign-out; unsynchronized
changes are only discarded after explicit confirmation.

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
