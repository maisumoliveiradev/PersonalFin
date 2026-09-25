# ADR-0015 --- Shared Financial Space Access Model

## Status

Accepted (2026-09-25, SDD-034). Supersedes ADR-0010.

## Context

v0.6.0 (Collaboration) lets people other than the Owner use a Financial
Space with granular permissions and presets (FR-003 to FR-007, DR-006 to
DR-009). ADR-0010 allowed access only to the Owner and deferred a
membership model to this release.

## Decision

-   Ownership stays in `financial_space.owner_user_id`, the single source
    of truth for "exactly one Owner" (DR-006). The Owner is never a
    member row (enforced by a trigger).
-   Other people access a space through `financial_space_member` rows
    with a permission set and lifecycle timestamps; at most one active
    membership per user and space. Removed memberships are kept for
    history.
-   Permissions: `view`, `record`, `plan`, `classify`, `manage_members`,
    `view_audit` (`packages/domain/src/permissions.ts`); `view` is always
    present. Presets (Viewer, Contributor, Administrator) are named
    permission sets, not stored roles, so custom sets need no new
    concept. The Owner holds every permission.
-   Every space-scoped endpoint calls
    `requireAccessibleSpace(userId, spaceId, permission)`. Missing,
    inaccessible, or malformed spaces return
    `404 FINANCIAL_SPACE_NOT_FOUND` (as in ADR-0010, not revealing other
    spaces); a member lacking the permission receives
    `403 PERMISSION_DENIED`. Clients hide actions without permission but
    never enforce authorization themselves.
-   Space responses include the caller's `role` (`owner` or `member`)
    and `permissions`.

## Alternatives Considered

1.  **Owner as a member row with an `owner` role.** One table for all
    access, but two sources of truth for ownership (the column is
    referenced widely) and a harder "exactly one Owner" invariant.
2.  **Fixed roles only.** Simpler, but FR-005 asks for granular
    permissions besides presets.
3.  **403 for non-members.** Reveals that a space ID exists.

## Consequences

-   Every new space-scoped endpoint must declare its permission; the
    permission matrix test (`apps/api/test/space-permissions.test.ts`)
    covers every endpoint and must be extended with new ones.
-   Records keep belonging to the space when members leave (DR-007,
    DR-008).

## References

SDD-034 to SDD-037; FR-003 to FR-007; DR-006 to DR-009; ADR-0010.
