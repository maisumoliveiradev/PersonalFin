# SDD-002 --- Base Authentication

## Objective

Introduce the smallest email/password authentication flow required for
v0.1.0.

## Dependencies

SDD-001 complete.

## Scope

-   authentication provider/service integration selected and documented;
-   sign up;
-   sign in;
-   sign out;
-   authenticated session restoration;
-   protected application area;
-   server-side identity validation for protected API operations;
-   basic auth error states.

## Non-scope

Google, Apple, MFA, connected-device management, remote logout UI,
advanced recovery/verification unless technically mandatory for selected
provider.

## Acceptance

-   A new user can create an account.
-   A valid user can sign in and access protected area.
-   An unauthenticated user cannot access protected financial API
    operations.
-   A signed-in user can sign out.

## Definition of Done

Relevant tests pass; secrets are not committed; auth decision is
documented; API contract is updated if applicable; current
state/changelog updated.
