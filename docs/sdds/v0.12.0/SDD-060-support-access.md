# SDD-060 --- Authorized Support Access

## Objective

Let a space Owner authorize a platform administrator to view the space
for support. The authorization needs a reason, has a scope and an
expiration, and every access is audited (FR-016, DR-101, ADR-0018).

## Scope

-   Database: `support_grant`; audit entity `support_grant` and action
    `access`.
-   API:
    - the Owner creates, lists, and revokes grants;
    - administrators list the grants given to them;
    - space access resolution accepts an active grant as read-only
      access and records each access.
-   Client:
    - "Acesso do suporte" for the Owner in the members area;
    - the administrator's list of authorized spaces;
    - the audit history shows accesses.

## Acceptance

-   Without an active grant, an administrator gets 404.
-   With an active grant, the administrator can read the space but gets
    403 on any change.
-   Expired or revoked grants stop working at once.
-   Every access appears in the audit history.

## Definition of Done

Migration, OpenAPI, unit and integration tests, journey, docs.
