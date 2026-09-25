# SDD-032 --- Dashboard Personalization and Experience Profiles

## Objective

Let each user adapt the space dashboard with an experience profile and
per-section visibility (FR-062, FR-067).

## Scope

-   API: per-user, per-space dashboard preferences (profile and section
    overrides) with defaults.
-   Client: preferences screen; the space screen shows sections
    according to the resolved preferences.

## Non-scope

Onboarding recommendation (FR-068), reordering sections, custom
metrics.

## Acceptance

-   Preferences of one user never affect another user; hiding a section
    never changes any value.

## Definition of Done

Migration, OpenAPI, tests, journey, docs, changelog.
