# TECHNICAL-DEBT.md

## Purpose

Track intentional implementation compromises that create meaningful
future work.

Roadmap features are not technical debt merely because they are not
implemented yet.

## Status values

-   Open
-   Planned
-   Resolved
-   Accepted

## Entry template

### TD-XXX --- Title

-   **Status:** Open
-   **Priority:** Low \| Medium \| High
-   **Origin:** SDD/release
-   **Reason:** Why the compromise was accepted.
-   **Impact:** What becomes harder/riskier.
-   **Resolution:** Expected remediation.
-   **Target version:** Optional.

## Current debt

### TD-001 --- Validation is enforced locally, not by the server

-   **Status:** Accepted
-   **Priority:** Medium
-   **Origin:** SDD-001
-   **Reason:** The project owner chose not to use hosted CI because of
    cost and notification concerns (ADR-0006).
-   **Impact:** `git push --no-verify` skips validation, and GitHub does
    not block merging a Pull Request whose branch fails validation.
-   **Resolution:** Run `npm run validate` before every merge. Revisit
    if a free, notification-free server-side check becomes acceptable.
-   **Target version:** None.

### TD-002 --- openapi-typescript peer dependency overridden to TypeScript 6

-   **Status:** Open
-   **Priority:** Low
-   **Origin:** SDD-001
-   **Reason:** `openapi-typescript` 7.13 declares `typescript@^5` as a
    peer, but Expo SDK 57 pins TypeScript 6. The root `package.json`
    `overrides` entry makes it use the workspace TypeScript.
    Generation and `contract:check` were verified to work.
-   **Impact:** An untested combination could break type generation
    after upgrades.
-   **Resolution:** Remove the override when `openapi-typescript`
    officially supports the workspace TypeScript version.
-   **Target version:** Next dependency upgrade.

### TD-003 --- Moderate `uuid` advisory in Expo build tooling

-   **Status:** Accepted
-   **Priority:** Low
-   **Origin:** SDD-001
-   **Reason:** `npm audit` reports GHSA-w5hq-g745-h8pq (`uuid` < 11.1.1)
    through `@expo/config-plugins`. The package is only used by build
    tooling, not by the shipped app. The advisory only applies when a
    buffer argument is passed to v3/v5/v6. `npm audit fix --force` would
    downgrade Expo.
-   **Impact:** None known for the running application.
-   **Resolution:** Resolved by an Expo release that updates the
    dependency; re-check `npm audit` on each Expo upgrade.
-   **Target version:** Next Expo SDK upgrade.

### TD-004 --- UI text is pt-BR only

-   **Status:** Open
-   **Priority:** Medium
-   **Origin:** SDD-002
-   **Reason:** FR-107 requires pt-BR and English, but no SDD has
    delivered localization yet. Strings are centralized in
    `apps/client/src/i18n/messages.ts` to keep the migration mechanical.
-   **Impact:** English-speaking users see Portuguese text.
-   **Resolution:** Introduce locale detection/selection and an English
    catalog in a localization SDD.
-   **Target version:** Before public release.

### TD-005 --- Theme follows the operating system only

-   **Status:** Open
-   **Priority:** Low
-   **Origin:** SDD-002
-   **Reason:** FR-106 requires Light, Dark, and System options stored in
    the user profile. The client implements only the System behavior.
-   **Impact:** Users cannot override the OS theme.
-   **Resolution:** Add a theme preference to the profile and a selector.
-   **Target version:** With profile settings.

### TD-006 --- Integration tests are not part of the pre-push hook

-   **Status:** Accepted
-   **Priority:** Medium
-   **Origin:** SDD-002
-   **Reason:** They need a running PostgreSQL (Docker); requiring it on
    every push would block pushes whenever Docker is stopped.
-   **Impact:** A persistence or auth regression can be pushed if
    `npm run test:integration` is skipped.
-   **Resolution:** Run it before merging changes to persistence or
    authentication; reconsider making it part of `validate`.
-   **Target version:** None.

### TD-007 --- Sign-up reveals whether an email is registered

-   **Status:** Open
-   **Priority:** Low
-   **Origin:** SDD-002
-   **Reason:** Better Auth answers `USER_ALREADY_EXISTS` on duplicate
    sign-up; hiding it properly requires email verification, which is
    outside SDD-002.
-   **Impact:** Allows account enumeration (mitigated by production rate
    limiting).
-   **Resolution:** Revisit when email verification is introduced.
-   **Target version:** Email verification SDD.

### TD-008 --- Client form logic has no automated tests

-   **Status:** Open
-   **Priority:** Medium
-   **Origin:** SDD-005
-   **Reason:** `apps/client` has no React Native test runner yet
    (ADR-0006). The underlying parsing rules are tested in
    `packages/domain`, but the form mapping
    (`features/transactions/transaction-form.ts`) and screens were
    verified only through manual browser automation.
-   **Impact:** UI regressions in forms are caught only manually.
-   **Resolution:** Introduce `jest-expo` (or move pure form mapping into
    a tested package) and cover the transaction form.
-   **Target version:** v0.2.0.

### TD-009 --- Date entry is a plain text field

-   **Status:** Open
-   **Priority:** Low
-   **Origin:** SDD-005
-   **Reason:** A cross-platform date picker would need a new
    dependency. Typing `DD/MM/AAAA` (defaulting to today) is enough for
    the v0.1.0 flow.
-   **Impact:** Slower date entry, especially on mobile.
-   **Resolution:** Adopt a date picker when the Design System adds one.
-   **Target version:** v0.2.0.

### TD-010 --- Client invoice suggestion ignores per-invoice date overrides

-   **Status:** Open
-   **Priority:** Low
-   **Origin:** SDD-024
-   **Reason:** The expense form suggests the invoice from the card's
    closing and due days (`defaultInvoiceMonth` in `packages/domain`)
    without a request per keystroke, and sends the month the user sees.
    The API applies overridden closing dates only when `invoiceMonth` is
    omitted.
-   **Impact:** When an invoice has an overridden closing date, the
    suggested invoice may differ from the one the override implies; the
    user can still pick the right invoice, and what is saved is what was
    shown.
-   **Resolution:** Expose the resolved default invoice (for example a
    query endpoint) and use it in the form.

### TD-011 --- Invitations are shared as links, not sent by email

-   **Status:** Open
-   **Priority:** Medium
-   **Origin:** SDD-035
-   **Reason:** FR-007 asks for email invitations, but sending email
    needs an external provider with credentials and possible costs. The
    project avoids paid or notifying hosted services unless the owner
    chooses one, so the invitation link is shown once to the inviter,
    who shares it.
-   **Impact:** The inviter must copy and send the link; there is no
    automatic delivery or reminder. The link grants nothing without the
    invited email's account.
-   **Resolution:** Owner chooses an email provider (and its cost
    limits); then add delivery behind the existing invitation flow.

### TD-014 --- Attachments are stored in the database

-   **Status:** Accepted
-   **Priority:** Low
-   **Origin:** SDD-057
-   **Reason:** Storing attachment bytes in PostgreSQL (`bytea`) keeps
    access checks, backups, and local development simple, with no
    storage service to operate.
-   **Impact:** Database size grows with attachments (at most 5 MB each,
    10 per transaction). Downloads go through the API.
-   **Resolution:** When volume justifies it, move bytes to encrypted
    object storage behind the same endpoints, keeping the metadata and
    SHA-256 in the database.

### TD-013 --- Base currency is fixed to BRL

-   **Status:** Open
-   **Priority:** Low
-   **Origin:** SDD-055
-   **Reason:** FR-081 asks for a configurable base currency. The client
    and several API modules format and store base amounts as BRL. These
    include cards, debts, goals, balance snapshots, analytics, and the
    PDF report. Changing the base currency of a space with history would
    also need a re-conversion policy.
-   **Impact:** All metrics are in BRL. Other currencies are supported
    as original amounts converted to BRL.
-   **Resolution:** Carry the space base currency through every money
    display and write path. Allow changing it only for spaces without
    transactions, or define an explicit re-conversion that keeps
    originals and rates.

### TD-012 --- Local offline data is not encrypted by the app

-   **Status:** Open
-   **Priority:** Medium
-   **Origin:** SDD-041
-   **Reason:** Offline reading and queued changes (ADR-0016) store
    financial data in AsyncStorage (native app sandbox) and
    `localStorage` (Web). Encrypting it would need a key kept in secure
    storage and a crypto dependency; the increment relies on the
    operating system and browser isolation instead.
-   **Impact:** Someone with access to an unlocked device, a rooted
    device, or the browser profile can read cached financial data. The
    cache is removed at sign-out and expires after 7 days.
-   **Resolution:** Encrypt local documents with a per-user key stored in
    `expo-secure-store` (native) and evaluate the Web threat model before
    offering offline data on shared computers.
