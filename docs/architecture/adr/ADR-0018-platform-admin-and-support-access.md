# ADR-0018 --- Platform Administration and Support Access

## Status

Accepted (2026-09-25, SDD-059 and SDD-060; decided by the AI agent under
the project owner's delegation, pending owner review)

## Context

FR-100 to FR-102 and FR-016 require a Super Admin role that is distinct
from space administration, has no implicit access to private finances,
sees only aggregate analytics, and can reach a user's data for support
only with explicit, scoped, expiring, and audited authorization.
`AGENTS.md` forbids silent administrative access to financial data.

## Decision

-   **Role storage:** the platform role is stored in `platform_admin`,
    separate from space membership (ADR-0015).
-   **Granting the role:** it is granted or revoked only with a local
    command run by the operator against the database. There is no API to
    grant it.
-   **Admin endpoints:** they live under `/admin/*` and check the role
    with `requirePlatformAdmin`. They return aggregate counts only.
-   **No implicit access:** `requireAccessibleSpace`, the single
    authorization point of space endpoints, does not consider the
    platform role.
-   **Support access:** it goes through `support_grant`.
    - The space Owner names an administrator and gives a reason, a
      read-only scope, and an expiry of at most 7 days.
    - The Owner can revoke it.
    - An active grant makes `requireAccessibleSpace` return
      `role: support` with only `view`. Every allowed access is recorded
      as an `access` audit event of the space.

## Alternatives Considered

1.  **A role column on `user`.** It mixes authentication data with
    authorization and is easier to change by mistake.
2.  **Admin impersonation.** It would give silent, unscoped access and
    violates FR-016.
3.  **A grant-role API guarded by an existing admin.** It needs
    bootstrapping and widens the attack surface. The operator CLI is
    enough for a single-operator product.

## Consequences

-   The operator runs a command to create the first administrator.
-   Support sessions are read-only. Any fix must be made by the user or
    through a normal membership.
-   Audit volume grows with each support access, which is intended.

## References

-   FR-016, FR-098 to FR-102; DR-100, DR-101
-   ADR-0007, ADR-0012, ADR-0015
-   SDD-059, SDD-060
