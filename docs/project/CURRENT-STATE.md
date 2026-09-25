# CURRENT-STATE.md

## Current Version

`v0.10.0`, released on 2026-09-25 (`main`, tag `v0.10.0`). SDD-001 to
SDD-056 implemented and validated
(`docs/sdds/v0.10.0/SDD-056-validation-report.md`). Pending owner
decisions: push notifications (v0.8.0), automatic exchange rates
(v0.10.0), invitation email (TD-011).

## Implemented Product Capabilities

-   **Authentication (SDD-002):** email/password sign-up, sign-in,
    sign-out, and session restoration on Web, Android, and iOS. Signed-in
    users see a protected home screen with their name. There is no email
    verification, password recovery, social login, MFA, or device/session
    management.

-   **Shared access (SDD-034):** spaces may have members with permission
    sets checked on every endpoint (ADR-0015, DR-087); the UI hides
    actions without permission. People join through single-use
    invitation links (SDD-035, DR-086); links are not emailed (TD-011).
    Managers change permissions and remove members; members can leave
    (SDD-036); the Owner can transfer ownership to a member (SDD-037,
    DR-087); members with `view_audit` see the space's audit history
    (SDD-038).
-   **Financial Spaces (SDD-003):** an authenticated user creates spaces
    by name, becomes their single Owner, and lists, selects, and enters
    them. The Owner and members can access a space (ADR-0015). Spaces are always
    Active; there is no rename, archive, or deletion. The selected space is carried in the URL
    (`/spaces/{spaceId}`), not persisted as a preference.

-   **Categories (SDD-004, SDD-011):** each new space receives the default
    pt-BR catalog once (`docs/product/DEFAULT-CATEGORY-CATALOG.md`).
    Categories have a kind (Expense/Income) and optional subcategories
    (two levels at most). Users create, rename, archive/unarchive, and
    delete never-used categories (DR-073); changes are audited. There is
    no reordering, merging, or historical reclassification.

-   **Transactions (SDD-005):** users register Expense or Income with
    description, amount (BRL), financial date, category matching the
    type, optional subcategory, and status (Paid/Received or Pending).
    There are no notes, attachments, or other currencies.
-   **Transaction edit (SDD-008):** every field can be edited from the
    list; edits are audited (actor, instant, before/after) and protected
    by optimistic concurrency (`version`, `409 VERSION_CONFLICT`). There
    is no audit history screen.
-   **Soft delete (SDD-009):** transactions can be deleted (with
    confirmation) and restored from the space's Lixeira; deletion and
    restore are audited. There is no permanent deletion.
-   **Balance snapshots (SDD-013):** each space shows its latest observed
    consolidated balance and date; users record new snapshots (zero or
    negative allowed) and view the append-only history.
-   **Balance reminder (SDD-014):** an in-app prompt on the space screen
    when an update is due (DR-074), with per-user, per-space frequency.
    There are no push or email notifications.
-   **Monthly dashboard (SDD-015):** the space screen summarizes the
    selected month with the metrics defined in `docs/product/METRICS.md`
    (realized, forecast, expenses by category, month-end observed
    balance) and the projected month-end balance with its components
    (SDD-021, M-008), plus a six-month projection list. There are no
    charts, comparisons, scenarios, or personalization.
-   **Recurrences (SDD-018):** monthly, weekly, or yearly series with
    optional end date and non-business-day rule; occurrences are Pending
    transactions created 12 months ahead and extended when browsing
    (ADR-0014). Occurrences are independent; "Este e os próximos" and
    "Encerrar" change the series without rewriting paid or individually
    edited occurrences (DR-076). Frequency and start date cannot be
    changed.
-   **Future commitments (SDD-020):** overdue and upcoming pending
    income/expenses (7, 30, or 90 days) with exact totals. There are no
    notifications.
-   **Cards (SDD-023):** cards with name, closing and due days, and an
    append-only limit history with effective dates (DR-085); archive and
    reactivate.
-   **Card purchases and invoices (SDD-024):** expenses paid with a card
    are assigned to an invoice (suggested from the closing day,
    changeable, DR-079); invoice screen with dates, total, purchases, and
    per-invoice date overrides. Card purchases count in their invoice
    month and have no status of their own; the projection and
    commitments use open invoices. The status filter "Pendente" still
    includes card purchases.
-   **Invoice payment (SDD-026):** full and partial payments per invoice
    (removable), open amount and state; purchases of paid invoices are
    realized (DR-081).
-   **Card limit and summary (SDD-027):** used and available limit per
    card (DR-082) and invoice totals by month. There are no charts or
    per-category card analytics.
-   **Installments (SDD-025):** card purchases split into 2--48
    installments across consecutive invoices (DR-080); later installments
    can be cancelled. Installments are edited one at a time.
-   **Analytics (SDD-030):** month comparison (previous month and previous
    year) and twelve-month evolution (M-009, M-010), and
    expenses by category and tag over 1--12 months (M-011, M-012,
    SDD-031). There are no charts, exports, or custom metrics.
-   **Dashboard personalization (SDD-032):** per-user, per-space
    experience profile and section visibility (DR-084). There is no
    onboarding recommendation or section reordering.
-   **Tags (SDD-029):** per-space tags (DR-083) on transactions, shown in
    the list and usable as a filter. There is no tag analytics yet.
-   **Minimum client version (SDD-040):** clients send
    `X-Client-Version`; with `MIN_CLIENT_VERSION` configured the API
    answers 426 to older clients, which show an update screen
    (ADR-0016).
-   **Offline reading (SDD-041):** screens already loaded keep working
    without a connection or when the API is unreachable, with a banner.
    The query cache is persisted per user in a versioned local store
    (ADR-0016). It is cleared at sign-out and expires after 7 days or on
    an app version change. The Web app cannot be opened offline (no
    service worker). No offline writes yet.
-   **Offline transaction changes (SDD-042):** transactions can be
    created, edited, have their status changed, or be deleted offline.
    Changes go to a per-user outbox and are sent when the connection
    returns.
    -   Creates carry a client UUID and replays are idempotent.
    -   Sync states and a "Não sincronizado" list appear on the space
        screen.
    -   Conflicts are resolved as described in SDD-043.
    -   Other writes need a connection (DR-088).
-   **Sync conflicts (SDD-043):** independent offline and online changes
    merge automatically. Same-field, edit-versus-delete, and
    delete-versus-edit conflicts wait for the user's choice in "Não
    sincronizado" (DR-089, DR-090). Resolutions are audited in
    `audit_event.context` and shown in the audit history.
-   **Debts (SDD-045):** per-space debts and loans with payments,
    outstanding balance, installments, next due date, and progress
    (DR-092). They are separate from transactions, and there is no
    interest model. Prepayments can be simulated (reduce the term or
    reduce the installment) and confirmed (SDD-046, DR-093).
-   **Goals (SDD-047):** space goals (visible to members; changing them
    needs `plan`) and global goals (owner only). The accumulated amount is
    updated manually with an append-only history. Goals never affect
    projections (DR-094).
-   **In-app reminders (SDD-048):** personal reminders on the space
    screen for pending transactions, invoices, debt installments, and a
    negative monthly projection. They use configurable offsets and can
    be dismissed per stage (DR-095). There are no push or email
    notifications (pending owner decision).
-   **Import (SDD-050):** CSV/XLSX import of transactions with explicit
    column mapping, per-row validation, duplicate review, confirmation,
    undo, discard, and history. The original file is stored (DR-096).
    There is no OFX and no saved mapping presets.
-   **Exports (SDD-051):** CSV (pt-BR) and XLSX exports of the filtered
    month's transactions, as a download on Web and through the share
    sheet on native (DR-097).
-   **Monthly PDF report (SDD-052):** metrics, expenses by category, and
    transactions of a month, using the dashboard's definitions.
-   **Portable backup (SDD-053):** a versioned JSON download of all
    accessible data, excluding other people's personal data and imported
    file bytes. There is no restore.
-   **Multi-currency (SDD-055):** foreign-currency transactions (8
    currencies) with the original amount, currency, and applied rate
    preserved, and exact conversion to BRL (ADR-0017, DR-098). Manual
    append-only rates. There are no automatic rates (pending owner
    decision), and the base currency is fixed to BRL (TD-013).
-   **Attachments (SDD-057):** images and PDFs on transactions, taken
    from files or the camera. The type is checked from the content, and
    access follows space permissions (DR-099). There is no OCR/AI
    extraction (pending owner decision).
-   **Quick status change (SDD-010):** each list item toggles between
    Paid/Received and Pending (audited, version-checked).
-   **Transaction list (SDD-006, SDD-012):** the space screen lists
    transactions of one month at a time (current month by default,
    navigable, kept in the URL), newest financial date first, with type,
    description, amount, date, category, and status. Optional filters:
    type, status, category, and accent-insensitive text search; results
    are paged by cursor ("Carregar mais"). There is no cross-space search
    or saved filters.

## Implemented Technical Foundation

-   npm workspaces monorepo (ADR-0001, ADR-0006):
    -   `apps/client` --- Expo SDK 57 app (Web via React Native Web,
        Android, iOS) with Expo Router, protected routes, TanStack Query,
        typed API client, pt-BR text catalog, and initial Design System
        tokens/components (ADR-0009).
    -   `apps/api` --- Node.js 24 + Fastify 5 API (ADR-0005) with Better
        Auth (ADR-0007), `GET /health`, protected `GET /me`, standard
        error body, validated configuration, structured logs.
    -   `packages/api-contract` --- OpenAPI 3.1 contract and generated
        TypeScript types.
    -   `packages/domain` --- shared money, financial date, transaction,
        month, balance-reminder, business-day, card, comparison, dashboard-preference, and client-version rules (ADR-0011;
        national holidays in `docs/product/BUSINESS-DAYS.md`).
-   PostgreSQL 17 via Docker Compose; versioned SQL migrations with
    checksum verification (ADR-0008), `0001` to `0028`. Tables: Better
    Auth `user`, `session`, `account`, `verification`; `financial_space`,
    `financial_space_member`, `space_invitation`, `category`,
    `financial_transaction`, `transaction_tag`, `tag`, `audit_event`,
    `balance_snapshot`, `balance_reminder_setting`, `recurrence_series`,
    `card`, `card_limit_change`, `card_invoice`, `card_invoice_payment`,
    `card_installment_purchase`, `dashboard_preference`, `debt`,
    `debt_payment`, `goal`, `goal_progress`, `reminder_setting`,
    `reminder_dismissal`, `import_batch`, `import_row`, `exchange_rate`, `attachment`; view
    `card_invoice_balance`.
-   Strict TypeScript, Biome, Vitest unit tests, and PostgreSQL
    integration tests (`npm run test:integration`).
-   Local CI: `npm run validate` enforced by a `pre-push` git hook. No
    hosted CI; GitHub Actions is disabled.
-   Environment strategy documented in `ARCHITECTURE.md`.

## Not Yet Present

-   Localization beyond pt-BR (TD-004); user-selectable theme (TD-005).
-   React Native component test runner (the client has Vitest unit tests
    for pure modules only).

## Active Target

`v0.11.0` --- Documents and OCR (`docs/sdds/v0.11.0/README.md`). SDD-057
implemented.

## Important Constraint

Future capabilities documented in Product Vision or Roadmap are not
implemented and must not be treated as available.

## Next Action

Run SDD-058 (v0.11.0 release validation). Owner decisions pending: FX
rate provider, push notifications (hosted push service), and invitation
email delivery (TD-011). Domain decisions taken under delegation await
owner review (`docs/sdds/v0.2.0/README.md` to
`docs/sdds/v0.11.0/README.md`, DR-072 to DR-099, ADR-0013 to ADR-0017).
