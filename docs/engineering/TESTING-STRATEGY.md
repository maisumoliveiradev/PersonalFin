# TESTING-STRATEGY.md

## Principle

Testing grows with product risk. Do not build a heavyweight test
platform before the product needs it.

## Tooling

-   Vitest runs unit tests for `apps/api` and shared packages. Tests
    live in each workspace's `test/` directory as `*.test.ts`.
-   API routes are tested in-process with Fastify `inject`, without
    opening network ports.
-   `apps/client` has no test runner yet. React Native component tests
    will need a React Native-capable runner (for example `jest-expo`)
    when the first UI test is justified (ADR-0006).
-   `npm run test` runs every workspace's tests; `npm run validate`
    includes them.

## v0.1.x

Prioritize unit tests for:

-   monetary value objects/calculations;
-   Financial Space ownership invariants;
-   category rules that affect integrity;
-   transaction validation;
-   authorization/domain policies introduced by the release.

UI tests should focus on high-value behavior rather than snapshots of
implementation details.

## Later stages

Introduce progressively:

1.  integration tests for persistence/use-case boundaries;
2.  API contract tests;
3.  critical end-to-end flows;
4.  offline/synchronization conflict tests;
5.  import/migration fixtures;
6.  security regression coverage.

## Test characteristics

Tests should be:

-   deterministic;
-   isolated where practical;
-   readable;
-   behavior-oriented;
-   fast enough for CI at their intended layer.

## Financial test data

Use explicit currency and exact values. Include rounding boundaries when
currency conversion is introduced.

## Completion

The active SDD defines required tests. Existing relevant tests must pass
before completion.
