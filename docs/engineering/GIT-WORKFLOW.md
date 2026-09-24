# GIT-WORKFLOW.md

## Initial strategy

Branches:

-   `main` --- production-ready history.
-   `develop` --- integration branch for staging/homologation.
-   `feature/*` --- bounded implementation work.

`release/*` and `hotfix/*` are intentionally deferred until release
complexity justifies them.

## Pull Requests

-   `develop` and `main` are protected.
-   Changes enter protected branches through Pull Requests.
-   CI checks must pass before merge.
-   Human approval is not artificially required in the initial
    solo-development phase, but may be introduced later.

## Feature branches

Prefer small branches aligned to one SDD or a clearly bounded part of
one SDD.

Examples:

`feature/sdd-001-foundation` `feature/sdd-002-auth-base`

## Commit discipline

Commits should be cohesive and describe intent. Avoid mixing unrelated
refactors with feature behavior.

## Merge flow

Typical early flow:

`feature/* → develop → main`

Production deployment policy is defined by CI/CD configuration and the
release SDD.

## Documentation

Documentation changes required by an SDD should travel with the
implementation PR.
