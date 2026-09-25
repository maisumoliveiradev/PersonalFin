# v0.6.0 --- Collaboration

Drafted by the AI agent on 2026-09-25 under the project owner's
delegation, from `ROADMAP.md` (v0.6.0), FR-003 to FR-007, FR-098,
DR-005 to DR-009, and ADR-0010. Domain decisions the documents left open
are listed here for owner review.

## Sequence

1.  `SDD-034-membership-and-permissions.md`
2.  `SDD-035-invitations.md`
3.  `SDD-036-member-management.md`
4.  `SDD-037-ownership-transfer.md`
5.  `SDD-038-space-audit-history.md`
6.  `SDD-039-release-validation.md`

## Decisions for owner review

-   **Access model (ADR-0015, supersedes ADR-0010):** ownership stays in
    `financial_space.owner_user_id` (exactly one Owner, DR-006). Other
    people access a space through active memberships. Every space-scoped
    endpoint checks a permission server-side; inaccessible spaces still
    return 404, and a member without the needed permission gets
    `403 PERMISSION_DENIED`.
-   **Permissions:** `view` (read everything in the space),
    `record` (transactions, balance snapshots, invoice payments),
    `plan` (recurrences, cards, invoice dates), `classify` (categories
    and tags), `manage_members` (invitations and members), and
    `view_audit`. Personal settings (balance reminder, dashboard
    preferences) only need `view`. The Owner has every permission plus
    ownership transfer.
-   **Presets (FR-005):** Viewer = view; Contributor = view, record;
    Administrator = every permission. Custom permission sets are allowed
    ("granular RBAC"); `view` is always included.
-   **Invitations (FR-007) --- email delivery deferred:** sending email
    needs an external provider with credentials and possibly costs,
    which the owner has not chosen (and the project avoids paid or
    notifying hosted services by default). Invitations are therefore
    shared as links: the API returns a single-use token once, stores only
    its hash, binds it to the invited email address, and expires it after
    7 days; it can be cancelled. Email delivery is TD-011.
-   **Member lifecycle:** members can be removed or leave; records they
    created stay in the space (DR-007, DR-008). The Owner cannot leave or
    be removed and must transfer ownership first (DR-009).
-   **Ownership transfer (FR-004):** the Owner transfers to an active
    member; the previous Owner becomes an Administrator member.
-   **Audit expansion:** membership, invitation, permission, and
    ownership changes are audited, and members with `view_audit` can see
    the space's audit history.

## Out of scope for v0.6.0

Email delivery, notifications, space archive/deletion lifecycle
(FR-008 to FR-010), per-record visibility, Super Admin.
