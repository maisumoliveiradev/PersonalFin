# REQUIREMENTS.md

## Purpose

Canonical catalog of accepted product requirements. IDs are stable
references for SDDs, ADRs, tests, and documentation.

## Product and tenancy

-   **FR-001** The system shall support multiple users.
-   **FR-002** Users shall organize finances into Financial Spaces such
    as Personal, Family/Home, and Company/PJ.
-   **FR-003** A Financial Space shall have exactly one Owner.
-   **FR-004** Ownership shall be transferable.
-   **FR-005** Shared spaces shall support granular permissions and
    presets such as Viewer, Contributor, and Administrator.
-   **FR-006** Records created in a shared space shall belong to the
    space and remain after a member leaves.
-   **FR-007** Invitations shall be sent by email and support
    expiration/cancellation.
-   **FR-008** Financial Spaces shall support Active, Archived, and
    Pending Deletion lifecycle states.
-   **FR-009** Archived spaces shall be excluded from current dashboards
    by default but remain available historically.
-   **FR-010** Space deletion shall use a recoverable grace period
    before final deletion.

## Authentication, privacy, and security

-   **FR-011** Authentication shall initially support email/password and
    evolve to verification, recovery, Google, Apple, and MFA readiness.
-   **FR-012** Users shall be able to maintain multiple active device
    sessions and revoke them remotely.
-   **FR-013** Mobile shall support optional biometric protection with
    application PIN fallback.
-   **FR-014** The product shall provide a Privacy & Data area.
-   **FR-015** Account deletion shall use a grace period and offer data
    backup/export first.
-   **FR-016** Sensitive support access shall require explicit
    authorization, reason, scope, expiration, and audit.
-   **NFR-001** Data shall be encrypted in transit and at rest using
    approved infrastructure.
-   **NFR-002** Authorization shall follow least privilege and isolate
    users/spaces.
-   **NFR-003** Sensitive financial payloads shall not be unnecessarily
    logged or emitted to telemetry.

## Transactions

-   **FR-017** Users shall register income and expenses.
-   **FR-018** Minimum transaction fields shall be type, description,
    amount, date, and category.
-   **FR-019** Transactions shall have a simple Pending or Paid/Received
    status model.
-   **FR-020** Each transaction shall have one category and optional
    subcategory.
-   **FR-021** Transactions may have multiple tags, notes, links, and
    attachments.
-   **FR-022** The system shall support bulk editing of compatible
    fields.
-   **FR-023** Bulk operations shall be audited and the last bulk change
    should be undoable when technically safe.
-   **FR-024** Refund/chargeback corrections may be represented by
    editing or soft-deleting the original record in the initial model.
-   **FR-025** The product shall use one primary editable financial date
    per transaction.
-   **FR-026** Financial calendar dates shall not shift due to timezone
    conversion.

## Classification

-   **FR-027** New spaces shall receive a concise default category
    catalog.
-   **FR-028** Some default categories shall include useful
    subcategories.
-   **FR-029** Categories and subcategories shall be customizable.
-   **FR-030** Used categories/subcategories shall be archived instead
    of destructively removed.
-   **FR-031** Reorganization shall allow forward-only or historical
    reclassification with impact preview.
-   **FR-032** Users shall create multiple custom tags per transaction.

## Balance and projection

-   **FR-033** Each Financial Space shall maintain its own consolidated
    balance.
-   **FR-034** Balance shall be entered manually as historical
    snapshots.
-   **FR-035** A new balance snapshot shall never overwrite prior
    snapshots.
-   **FR-036** Balance reminder frequency shall be configurable: app
    start, daily, every X days, or never.
-   **FR-037** The system shall distinguish Realized, Forecast, and
    Projection.
-   **FR-038** Projection shall combine current observed balance,
    expected income, and future commitments.
-   **FR-039** Users shall navigate detailed monthly and longer-term
    projection views.

## Recurrences

-   **FR-040** Income and expenses shall support recurrence series.
-   **FR-041** Individual recurrence occurrences shall remain
    independently editable.
-   **FR-042** Recurrences may have no end date or a defined end date.
-   **FR-043** Recurrences shall configure non-business-day behavior:
    keep, previous business day, or next business day.
-   **FR-044** Business-day logic shall support Brazilian national,
    state, and municipal holidays according to configured locality.

## Credit cards and installments

-   **FR-045** Cards shall store limit, closing date, due date,
    invoices, purchases, and installment purchases.
-   **FR-046** Card purchases shall count as expense in the invoice
    month.
-   **FR-047** Paying an invoice shall not create a duplicate expense.
-   **FR-048** Invoice assignment shall be calculated from closing rules
    but allow manual override.
-   **FR-049** Installment purchases shall generate future installments
    from total value, count, and first invoice.
-   **FR-050** Cards shall calculate known used and available limit.
-   **FR-051** Card limit changes shall preserve effective-date history.
-   **FR-052** Individual invoices may override default closing/due
    dates.
-   **FR-053** Partial invoice payments shall be supported.
-   **FR-054** Future installments may be cancelled while preserving
    realized history.

## Debts and goals

-   **FR-055** Debts/loans shall be distinct from recurring expenses and
    card installments.
-   **FR-056** Debt tracking shall support original value, installments,
    paid/remaining installments, outstanding balance, and payoff
    progress.
-   **FR-057** Debt amortization simulations shall not change real data
    until explicitly confirmed.
-   **FR-058** Financial goals shall have target and manually maintained
    accumulated values.
-   **FR-059** Goals may belong to a Financial Space or be global.
-   **FR-060** Goals shall not automatically reduce projected balance in
    the initial model.

## Analytics

-   **FR-061** Dashboards shall support balance evolution, income vs
    expenses, categories, tags, monthly evolution, cards, commitments,
    and projected cash flow as capabilities evolve.
-   **FR-062** Dashboard configuration shall be personalized per user.
-   **FR-063** Predefined comparisons shall include current vs previous
    month and equivalent prior-year period where applicable.
-   **FR-064** Built-in metrics shall have centralized documented
    definitions.
-   **FR-065** Users shall eventually create custom metrics through a
    visual builder and validated advanced expressions.
-   **FR-066** Custom expressions shall not execute arbitrary code.
-   **FR-067** Experience profiles shall support Basic, Intermediate,
    and Advanced defaults.
-   **FR-068** Onboarding may recommend an experience profile while
    leaving final choice to the user.

## Search, reminders, capture, and AI

-   **FR-069** Search shall be simple by default with expandable
    advanced filters.
-   **FR-070** Notifications shall support in-app and mobile push
    channels.
-   **FR-071** Users shall configure reminder presets and per-item
    overrides where useful.
-   **FR-072** Mobile shall provide configurable quick actions.
-   **FR-073** Reusable transaction templates shall prefill common
    fields.
-   **FR-074** Transactions shall support image/PDF attachments.
-   **FR-075** OCR/AI document capture shall accept camera, image, and
    PDF sources.
-   **FR-076** OCR/AI shall initially extract objective fields such as
    amount, date, and establishment/description.
-   **FR-077** Extracted information shall require user review before
    saving.
-   **FR-078** AI shall not initially act as a financial advisor or
    autonomously assign subjective categories/tags.

## Currency, import, export, backup

-   **FR-079** The platform shall support multiple currencies.
-   **FR-080** Original amount, original currency, and applied
    historical FX rate shall be preserved.
-   **FR-081** A configurable global base currency shall default
    initially to BRL.
-   **FR-082** FX shall support automatic daily rates and manual
    override.
-   **FR-083** CSV/Excel imports shall use read, validate, preview,
    resolve, confirm, import.
-   **FR-084** Suspected duplicates shall be presented for user
    decision.
-   **FR-085** Architecture shall allow future OFX import without
    requiring bank integration in V1.
-   **FR-086** The existing spreadsheet shall be treated as initial
    historical data source and migrated with traceability.
-   **FR-087** After validated migration, the application shall become
    the financial source of truth.
-   **FR-088** Users shall export filtered data in CSV/Excel and reports
    in PDF.
-   **FR-089** Full portable backup/restore shall be distinct from
    reporting exports.
-   **FR-090** Infrastructure shall support automatic backups and
    documented restoration.

## Offline and synchronization

-   **FR-091** Mobile target architecture shall support offline-first
    operation.
-   **FR-092** Offline-capable records shall use globally unique
    application-generated IDs.
-   **FR-093** Sync UI shall expose offline, pending, syncing, synced,
    and error states when relevant.
-   **FR-094** Non-conflicting concurrent edits may merge automatically.
-   **FR-095** Same-field conflicts shall require explicit resolution.
-   **FR-096** Delete-vs-offline-edit conflicts shall require explicit
    resolution.
-   **FR-097** Local storage schema shall use versioned migrations and
    compatibility policy.

## Audit and administration

-   **FR-098** Relevant creation, edits, deletion, restoration,
    permission changes, and sensitive access shall be audited.
-   **FR-099** Audit history shall be retained while the account exists,
    subject to final retention/deletion policy.
-   **FR-100** Super Admin shall be distinct from Financial Space
    administration.
-   **FR-101** Super Admin may manage platform operations and aggregate
    product analytics without implicit private-finance access.
-   **FR-102** Product analytics shall prefer aggregate/non-sensitive
    information.

## Platform and UX

-   **FR-103** Target platforms are Web, Android, and iOS.
-   **FR-104** Platforms shall aim for functional parity with
    platform-adapted UX.
-   **FR-105** Web shall be responsive.
-   **FR-106** Theme shall support Light, Dark, and System.
-   **FR-107** Product localization shall support pt-BR and English.
-   **FR-108** WCAG 2.2 AA shall be the accessibility reference.
-   **FR-109** Design System shall evolve incrementally from tokens and
    required components.

## Engineering constraints

-   **NFR-004** Monetary arithmetic shall not use binary floating point.
-   **NFR-005** API contracts shall use OpenAPI as source of truth when
    the API is introduced.
-   **NFR-006** Database structural changes shall use versioned
    migrations.
-   **NFR-007** Meaningful architectural decisions shall be documented
    through ADRs.
-   **NFR-008** Documentation shall be updated as part of the applicable
    SDD Definition of Done.
-   **NFR-009** CI shall progressively enforce lint, typecheck, and
    existing automated tests.
-   **NFR-010** Development, Staging/Homologation, and Production
    data/configuration shall be isolated.
-   **NFR-011** API evolution shall consider older mobile clients and
    minimum-supported-version policy.
-   **NFR-012** Metrics shall have one centralized semantic definition
    across product surfaces.

## Initial release boundary

`v0.1.0` is intentionally limited to:

1.  minimum project foundation;
2.  base authentication;
3.  creation of the first Financial Space;
4.  initial categories;
5.  manual income/expense registration;
6.  minimum list/read experience needed to validate the created
    transaction.

Anything beyond this boundary requires a later SDD/release unless
explicitly required as technical foundation.
