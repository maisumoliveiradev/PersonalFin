# CHANGELOG.md

All notable delivered product changes are recorded here.

The project follows incremental semantic-style product versions.

## \[Unreleased\]

### Offline Transaction Changes (SDD-042)

-   With no connection, transactions can be created (including a single
    card purchase), edited, marked paid or pending, and deleted. Each
    change is saved on the device and sent when the connection returns.
    Changes whose request fails at the network level are saved the same
    way.
-   The space shows the sync state (offline, pending, syncing,
    synchronized, attention needed) and a "Não sincronizado" list. Items
    in the list can be retried or discarded after confirmation. Rows with
    a pending change are marked, and signing out with pending changes
    asks for confirmation.
-   API: `POST .../transactions` accepts an optional client `id`. A
    replay by the same author returns the existing transaction (`200`);
    other reuse returns `409 TRANSACTION_ID_CONFLICT`.
-   Recurrence, installments, "Este e os próximos", and non-transaction
    actions still need a connection (DR-088).

### Offline Reading (SDD-041)

-   Data already viewed stays available without a connection or when the
    server cannot be reached. A banner shows "Sem conexão. Mostrando os
    dados salvos neste aparelho."
-   The local copy is saved per user with a versioned local schema
    (FR-097). It is removed at sign-out and discarded after 7 days or
    when the app version changes.
-   New dependency `@react-native-async-storage/async-storage`. Client
    unit tests (Vitest) for local storage logic. TD-012 (local data is
    not encrypted by the app).

### Minimum Supported Client Version (SDD-040)

-   Clients send their version (`X-Client-Version`). When the operator
    sets `MIN_CLIENT_VERSION`, older or unversioned clients receive
    `426 CLIENT_UPGRADE_REQUIRED` and the app shows "Atualize o
    PersonalFin". Nothing is blocked by default.
-   ADR-0016 (offline persistence and synchronization) and the v0.7.0
    SDDs (SDD-040 to SDD-044); DR-088 to DR-091.

## \[0.6.0\] --- 2026-09-25

Collaboration. Released to `main` and tagged `v0.6.0`; validated in
SDD-039 (`docs/sdds/v0.6.0/SDD-039-validation-report.md`).

### Space Audit History (SDD-038)

-   "Histórico de alterações": members with `view_audit` see who created,
    changed, or removed data in the space, newest first, with field
    changes; the history is read-only and paged.
-   Membership, invitation, permission, and ownership changes are
    audited (SDD-034 to SDD-037).
-   `GET .../audit-events`; migration `0021_audit_history_index`.

### Ownership Transfer (SDD-037)

-   The Owner transfers ownership to a member from "Membros" after
    confirmation; the previous Owner stays as Administrator and may then
    leave (DR-087). Audited.
-   `POST .../ownership-transfer`.

### Member Management (SDD-036)

-   "Membros" lists the Owner and members for everyone in the space;
    managers change a member's permissions (checkboxes) and remove
    members; members can leave. Records they created stay in the space
    (DR-007, DR-008); the Owner cannot leave or be removed (DR-009).
-   Changes are version-checked and audited.
-   `GET .../members`, `PATCH`/`DELETE .../members/{userId}`,
    `POST .../leave`.

### Invitations (SDD-035)

-   "Membros" screen: invite a person by email as Visualizador,
    Colaborador, or Administrador; the single-use link (valid 7 days) is
    shown once to be shared; pending invitations can be cancelled
    (DR-086).
-   Invitation screen at `/invite/{token}`: shows the space and access,
    and only the account of the invited email can accept.
-   Invitation links are not emailed yet (TD-011).
-   `GET`/`POST .../invitations`, `DELETE .../invitations/{id}`,
    `GET /invitations/{token}`, `POST /invitations/{token}/accept`;
    migration `0020_space_invitations`.

### Membership and Permissions (SDD-034)

-   Spaces can have members with permission sets (Viewer, Contributor,
    Administrator, or custom; DR-085). Every space endpoint checks the
    permission of its action; members without it receive
    `403 PERMISSION_DENIED`, non-members still receive 404 (ADR-0015,
    superseding ADR-0010).
-   Space responses include the caller's `role` and `permissions`; the
    space list and screen show "Proprietário" or "Membro", and actions
    the member cannot perform are hidden.
-   Migration `0019_space_members`. Adding members arrives with
    invitations (SDD-035).

## \[0.5.0\] --- 2026-09-25

Analytics. Released to `main` and tagged `v0.5.0`; validated in SDD-033
(`docs/sdds/v0.5.0/SDD-033-validation-report.md`).

### Dashboard Personalization (SDD-032)

-   "Personalizar resumo": each user picks an experience profile per
    space (Básico, Intermediário, Avançado; default Avançado) and can
    show or hide individual sections on top of it (DR-084).
-   The space screen shows the observed balance, realized and forecast
    groups, projection, next months, commitments, and analytics according
    to the preferences.
-   `GET`/`PUT .../dashboard-preferences`; migration
    `0018_dashboard_preferences`.

### Category and Tag Analytics (SDD-031)

-   "Para onde foi o dinheiro" on the Análises screen: realized expenses
    of 1, 3, 6, or 12 months by category (with subcategories) and by tag,
    with share and the previous period of equal length.
-   Metric catalog: M-011 and M-012.
-   `GET .../analytics/breakdown`.

### Evolution and Comparisons (SDD-030)

-   "Análises" screen: the selected month against the previous month and
    the same month of the previous year (difference and percentage), and
    the twelve-month evolution of realized income, expenses, and net with
    proportional bars.
-   Metric catalog: M-009 (evolution) and M-010 (comparison).
-   `GET .../analytics/evolution` and `GET .../analytics/comparison`.

### Tags (SDD-029)

-   "Tags" screen per space: create, rename, archive/reactivate, and
    delete never-used tags (audited, DR-083).
-   Transactions take up to 10 tags in the form, show them as `#tag`
    in the list, and can be filtered by tag; tags never change amounts
    (DR-013).
-   `GET`/`POST .../tags`, `PATCH`/`DELETE .../tags/{tagId}`, `tagIds`
    on transactions, `tags` in responses, `tagId` filter; migration
    `0017_tags`.

## \[0.4.0\] --- 2026-09-25

Credit Cards. Released to `main` and tagged `v0.4.0`; validated in
SDD-028 (`docs/sdds/v0.4.0/SDD-028-validation-report.md`).

### Card Limit and Summary (SDD-027)

-   The cards screen shows used and available limit per card, counting
    future installments and payments (DR-082).
-   The card screen lists its invoices from two months back to three
    months ahead with total and state, each opening the invoice.
-   Fixed: the payment confirmation now stays visible after the invoice
    refreshes.
-   `GET .../card-limits?on=` and `GET .../cards/{cardId}/invoices`.

### Invoice Payment (SDD-026)

-   "Pagar fatura" on the invoice screen records full or partial
    payments (never above the open amount); the invoice shows paid, open
    amount, and state, and payments can be removed (audited, DR-081).
-   Payments never create expenses (DR-036); purchases of a paid invoice
    count as realized and show "(paga)".
-   The projection subtracts the unpaid part of invoices and payments
    after the observation; commitments list only open amounts.
-   `POST`/`DELETE .../invoices/{month}/payments`; migration
    `0016_invoice_payments`.

### Installment Purchases (SDD-025)

-   Card purchases can be split into 2 to 48 installments ("Parcelas"),
    one per invoice, with exact cents (remainder on the first) and
    "parcela k/n" in the list (DR-080).
-   "Cancelar parcelas seguintes" on an installment moves the later
    installments to the trash, keeping this and earlier ones (audited).
-   `installments` on transaction creation, `installment` in responses,
    `POST .../installment-purchases/{purchaseId}/cancel`; migration
    `0015_installment_purchases`.

### Card Purchases and Invoices (SDD-024)

-   Expenses can be paid with a card ("Pagamento"): the invoice is
    suggested from the card's closing day and can be changed; card
    purchases show their card and invoice instead of a status.
-   Invoice screen per card and month with closing and due dates, total,
    and purchases; each invoice can have its own dates (DR-038, DR-079).
-   Card purchases count in the metrics of their invoice month (DR-035);
    the projection and "Próximos compromissos" use open invoices at
    their due date instead of individual purchases.
-   `cardId`/`invoiceMonth` on transactions, `cardPurchase` in responses,
    `GET .../cards/{cardId}/invoices/{month}`, `PUT .../dates`,
    `openInvoices` in the projection, and `invoices` in commitments;
    migration `0014_card_invoices`. Recorded TD-010.

### Cards and Limits (SDD-023)

-   "Cartões" screen per space: register cards with name, closing day,
    due day, and initial limit; edit days and name; archive/reactivate
    (audited, version-checked).
-   The card limit keeps its history: new limits are recorded with an
    effective date and never overwrite earlier values (DR-078).
-   `GET`/`POST .../cards`, `GET`/`PATCH .../cards/{cardId}`, and
    `POST .../cards/{cardId}/limit-changes`; migration `0013_cards`.

## \[0.3.0\] --- 2026-09-24

Planning and Recurrence. Released to `main` and tagged `v0.3.0`;
validated in SDD-022 (`docs/sdds/v0.3.0/SDD-022-validation-report.md`).

### Monthly Projection (SDD-021)

-   The "Resumo do mês" card has a "Projeção" group with the projected
    month-end balance (M-008) and its base and components, separate from
    realized and forecast values (DR-077).
-   "Projeção dos próximos meses" lists M-008 for six months from the
    selected month.
-   The dashboard response includes `projection`; new
    `GET /financial-spaces/{spaceId}/projection?fromMonth=&months=`.

### Future Commitments (SDD-020)

-   "Próximos compromissos" screen: overdue pending items and pending
    items of the next 7, 30, or 90 days, with exact totals of income to
    receive and expenses to pay, and quick "Marcar como pago".
-   `GET /financial-spaces/{spaceId}/commitments?from=&days=`.

### Independent Occurrences and Series Changes (SDD-019)

-   Editing an occurrence offers "Apenas este" or "Este e os próximos";
    the latter updates description, amount, and category of the series
    and of later pending occurrences not edited individually (DR-076).
-   "Encerrar" on the Recorrências screen ends a series on a date and
    moves later pending occurrences to the trash.
-   `PATCH .../recurrences/{id}` and `POST .../recurrences/{id}/end`;
    transactions expose `occurrenceDate`; migration
    `0012_occurrence_independence`.

### Recurring Income and Expenses (SDD-018)

-   "Repetir" in the new-transaction form creates a monthly, weekly, or
    yearly series with optional end date and a weekend/holiday rule.
-   Occurrences are Pending transactions (marked "↻ Recorrente"), so they
    appear in the list, filters, and forecast; later months are created
    when browsed (ADR-0014, DR-075).
-   "Recorrências" screen lists the series of a space.
-   `GET`/`POST .../recurrences` and `POST .../recurrences/materialize`;
    migration `0011_recurrence_series`.

### Versioned Browser Journeys

-   The 13 Chrome journeys used to validate every increment now live in
    `e2e/` and run with `npm run test:e2e` (ADR-0013).

### Business-Day Calendar Foundation (SDD-017)

-   `packages/domain` computes Brazilian national holidays (including
    Good Friday via Easter) and adjusts dates to the previous or next
    business day (`docs/product/BUSINESS-DAYS.md`).

## \[0.2.0\] --- 2026-09-24

Core Financial Control. Released to `main` and tagged `v0.2.0`;
validated in SDD-016 (`docs/sdds/v0.2.0/SDD-016-validation-report.md`).

### Current-Month Dashboard (SDD-015)

-   "Resumo do mês" card on the space screen, following the selected
    month: realized income, expenses, and net; forecast (pending) income
    and expenses; realized expenses by category; and, for past months,
    the balance observed up to the end of the month.
-   Metric catalog `docs/product/METRICS.md` (M-001 to M-007); values are
    computed only by `GET /financial-spaces/{spaceId}/dashboard?month=`.
-   Fixed: recording a balance now refreshes the dashboard.

### Balance Update Prompt (SDD-014)

-   The space screen asks "Qual é o seu saldo hoje?" when the balance
    reminder is due (DR-074), with "Informar saldo" and "Depois" (hidden
    until the next app start).
-   Each user configures the frequency per space in the balance history
    screen: on app start, daily, every N days (1--90), or never; default
    every 7 days.
-   `GET` and `PUT /financial-spaces/{spaceId}/balance-reminder`;
    migration `0010_balance_reminder_settings`; due-date rules in
    `packages/domain`.

### Consolidated Balance Snapshots (SDD-013)

-   Each space shows its observed consolidated balance ("Saldo
    observado") with the date it refers to; users record a new balance
    (zero or negative allowed, optional note) and see the full history.
-   Snapshots are append-only: new records never overwrite earlier ones,
    enforced by the database (DR-024). They are not transactions.
-   `GET` and `POST /financial-spaces/{spaceId}/balance-snapshots`;
    migration `0009_balance_snapshots`.
-   `packages/domain` parses signed balance input.

### Transaction Filters and Search (SDD-012)

-   The transaction list is organized by month (current month by default,
    with previous/next navigation; the month is kept in the URL) and
    jumps to the month of a transaction after it is saved.
-   Optional filters: type, status, category (including subcategory
    matches), and case- and accent-insensitive search in descriptions.
-   Cursor pagination with "Carregar mais"; every matching transaction
    appears exactly once.
-   `GET .../transactions` accepts `month`, `type`, `status`,
    `categoryId`, `q`, and `cursor`, and returns `nextCursor`.
-   Migration `0008_transaction_search` enables the PostgreSQL `unaccent`
    extension.

### Category Management (SDD-011)

-   New "Categorias" screen per space: create categories (with kind) and
    subcategories, rename, archive/unarchive, and permanently delete
    never-used ones. Changes are audited and version-checked.
-   Archived categories are hidden from new transactions but kept on
    existing ones (DR-073); used categories cannot be deleted
    (`409 CATEGORY_IN_USE`).
-   `POST .../categories`, `PATCH` and `DELETE .../categories/{id}`;
    category items expose `archived` and `version`.
-   The read-only category overview on the space screen was replaced by a
    link to the management screen.

### Quick Status Change (SDD-010)

-   Each transaction in the list has a button to mark it as Paid/Received
    or back to Pending; the change is version-checked and audited, and a
    conflicting change shows an error and refreshes the list.

### Transaction Soft Delete and Restore (SDD-009)

-   Transactions can be deleted from the edit screen after confirmation;
    they move to the space's Lixeira (trash) and can be restored with
    identical values.
-   Deleted transactions are excluded from the list and cannot be edited
    (`409 TRANSACTION_DELETED`); delete and restore are audited and
    version-checked.
-   `DELETE .../transactions/{id}?version=`, `POST .../restore`, and
    `GET .../transactions?state=deleted`.

### Transaction Edit (SDD-008)

-   Transactions can be edited (all fields) from the list; the form is
    shared with creation.
-   Every effective edit is recorded in the append-only audit log with
    actor and before/after values (ADR-0012).
-   Optimistic concurrency: edits based on an outdated version are
    rejected with `409 VERSION_CONFLICT` instead of overwriting.
-   `GET` and `PATCH /financial-spaces/{spaceId}/transactions/{transactionId}`;
    transactions now expose `version`.
-   Fixed: option groups and buttons now expose their selected, disabled,
    and busy states to Web screen readers.

## \[0.1.0\] --- 2026-09-24

Released to `main` and tagged `v0.1.0`. Validated in SDD-007
(`docs/sdds/v0.1.0/SDD-007-validation-report.md`).

First usable vertical slice: authenticate, create a Financial Space,
receive default categories, register income and expenses, and list
them on Web (and Android/iOS from the same codebase).

### Release validation (SDD-007)

-   Validation report recorded; no new functionality.
-   Development `TRUSTED_ORIGINS` example now includes `exp://` so Expo Go
    can authenticate.
-   Workspace and app versions set to 0.1.0.

### Transaction List (SDD-006)

-   The space screen lists its transactions (newest financial date
    first) with type, description, amount, date, category/subcategory,
    and status, plus loading, error, and empty states.
-   `GET /financial-spaces/{spaceId}/transactions` with `limit`
    (default 100, max 200) and `hasMore`.
-   Amounts and dates are formatted for pt-BR without changing stored
    values.

### Manual Income and Expense (SDD-005)

-   Users register an Expense or Income with description, amount, date,
    category, optional subcategory, and status (Paid/Received by
    default, or Pending), in BRL.
-   `POST /financial-spaces/{spaceId}/transactions`; categories must
    belong to the space and match the type (`422 CATEGORY_NOT_AVAILABLE`).
-   Money stored as integer centavos (`bigint`) and exchanged as
    `amountMinor`; financial dates stored as `date` and exchanged as
    `YYYY-MM-DD` without timezone conversion (ADR-0011).
-   New shared package `packages/domain` for money and date rules.
-   Migration `0004_transactions`; transaction author recorded.
-   Recorded TD-008 and TD-009.

### Initial Categories (SDD-004)

-   Every new Financial Space receives the default pt-BR category
    catalog exactly once, in the same transaction that creates the space
    (`docs/product/DEFAULT-CATEGORY-CATALOG.md`).
-   Categories have a kind (Expense or Income) and at most one level of
    subcategories, enforced by the database. DR-072 was proposed.
-   `GET /financial-spaces/{spaceId}/categories` returns the category
    tree; the space screen shows it grouped by kind.
-   Migration `0003_categories`.

### First Financial Space (SDD-003)

-   Users create Financial Spaces (name only); the creator is the Owner
    and the space starts Active.
-   New users are guided to create their first space (name suggested as
    "Pessoal"); users list, select, and enter their spaces.
-   `GET /financial-spaces`, `POST /financial-spaces`, and
    `GET /financial-spaces/{spaceId}`; inaccessible spaces return `404`.
-   Migration `0002_financial_spaces`.
-   Request validation with zod and `400 VALIDATION_FAILED` errors.
-   ADR-0010 (Financial Space ownership and access model).

### Base Authentication (SDD-002)

-   Email/password sign-up, sign-in, sign-out, and session restoration
    on Web, Android, and iOS (Better Auth, ADR-0007).
-   Protected area in the client; signed-out users only reach sign-in and
    sign-up.
-   `GET /me` protected endpoint; all protected API routes reject
    missing or invalid sessions with `401 UNAUTHENTICATED`.
-   PostgreSQL persistence with versioned SQL migrations (ADR-0008) and
    local Docker Compose database.
-   Client architecture: Expo Router, TanStack Query, typed
    `openapi-fetch` client, pt-BR text catalog, and first Design System
    tokens/components (ADR-0009).
-   Standard API error body (`{ error: { code, message } }`).
-   Recorded TD-004 to TD-007.

### Foundation (SDD-001)

-   npm workspaces monorepo with `apps/client` (Expo universal app shell
    for Web, Android, iOS), `apps/api` (Fastify API shell with
    `GET /health`), and `packages/api-contract` (OpenAPI contract and
    generated types).
-   Strict TypeScript, Biome lint/format/import ordering, and Vitest
    unit tests.
-   Local CI via `npm run validate` and a `pre-push` git hook.
-   Validated API environment configuration and structured logging.
-   Accepted ADR-0001 (platform strategy); added ADR-0005 (API shell)
    and ADR-0006 (quality toolchain and local CI).
-   Recorded TD-001, TD-002, and TD-003.

### Documentation

-   Established initial product vision.
-   Established requirements and domain-rule catalogs.
-   Established architecture and engineering documentation.
-   Established agent operating rules and specialist skills.
-   Prepared v0.1.0 SDD sequence.

