# v0.12.0 --- Platform Administration

Drafted by the AI agent on 2026-09-25 under the project owner's
delegation. Sources: `ROADMAP.md` (v0.12.0), FR-016, FR-098 to FR-102,
`PRODUCT-VISION.md` sections 34 and 35, and the "Security" and
"Authentication and Authorization" sections of `AGENTS.md`. Decisions
for owner review are listed here.

## Sequence

1.  `SDD-059-platform-admin.md`
2.  `SDD-060-support-access.md`
3.  `SDD-061-release-validation.md`

## Decisions for owner review

-   **Super Admin (ADR-0018, DR-100):**
    - a platform role stored in `platform_admin`;
    - granted and revoked only with the local command
      `npm run admin -- grant|revoke|list`, with no API endpoint, so no
      one can promote themselves;
    - the role never grants access to financial spaces.
-   **Operations overview (FR-101, FR-102):**
    - aggregate counts only: users (total, new, active in 30 days),
      spaces (total, shared, new), transactions (total, new), how many
      spaces use each feature, and migrations;
    - no amounts, names, or per-user data.
-   **Support access (FR-016, DR-101):**
    - a space's Owner authorizes one named platform administrator;
    - the authorization is read-only, needs a reason, and expires in 1
      to 7 days; the Owner can revoke it at any time;
    - while active, the administrator can view that space and nothing
      else;
    - each access is recorded in the space's audit history, so the Owner
      sees who accessed and when.
-   **Not done:**
    - crash and error reporting, performance monitoring, and release
      adoption by client version; these need observability tooling or
      telemetry the owner has not chosen;
    - account status management (suspension).

## Out of scope for v0.12.0

- Hosted observability or error-tracking services.
- Suspending or deleting accounts from the administration.
- Support access with write permissions.
