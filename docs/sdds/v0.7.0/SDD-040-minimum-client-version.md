# SDD-040 --- Minimum Supported Client Version

## Objective

Allow the operator to require a minimum client version, so the API can
evolve safely while mobile clients stay installed on older versions
(ROADMAP v0.7.0, AGENTS.md "API Contracts").

## Scope

-   Domain: parse and compare `MAJOR.MINOR.PATCH` versions.
-   API:
    - optional `MIN_CLIENT_VERSION` configuration;
    - every route except `/health` and `/api/auth/*` rejects clients
      whose `X-Client-Version` is missing, invalid, or lower with
      `426 CLIENT_UPGRADE_REQUIRED`;
    - no check when the setting is unset.
-   Client:
    - sends its version (`app.json`) on every API call;
    - shows a blocking "Atualize o app" screen when the API answers 426.
-   OpenAPI, ADR-0016, and docs.

## Non-scope

Store links, forced in-app updates, API versioning in the path.

## Acceptance

-   With no minimum configured, behavior is unchanged.
-   With a minimum configured:
    - an older or unversioned client gets 426 with the code
      `CLIENT_UPGRADE_REQUIRED`;
    - an equal or newer version passes.
-   The client shows the update screen instead of failing silently.

## Definition of Done

Unit tests (domain parsing, API hook), OpenAPI, journey, docs,
changelog.
