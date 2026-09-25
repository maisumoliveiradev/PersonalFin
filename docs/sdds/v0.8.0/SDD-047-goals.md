# SDD-047 --- Financial Goals

## Objective

Define goals with a target and manually maintained progress, per space or
global (FR-058 to FR-060, DR-048 to DR-050, DR-094).

## Scope

-   Database: `goal` (space or owner-only global) and the append-only
    `goal_progress`.
-   API:
    - global goals under `/goals`, which are the caller's only;
    - space goals under `/financial-spaces/{id}/goals` (view, and `plan`
      to change them);
    - create, edit, archive, and update progress;
    - progress history.
-   Client:
    - a "Metas" screen for a space, and "Minhas metas" for global goals;
    - progress bar and history.

## Acceptance

-   Progress is exact.
-   Global goals are invisible to anyone else.
-   Goals do not change the dashboard or projection.

## Definition of Done

Migration, OpenAPI, tests (including isolation), journey, docs.
