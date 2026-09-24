# ADR-0001 --- Cross-Platform Application Strategy

## Status

Proposed

## Context

The product targets Web, Android, and iOS with functional parity and
platform-adapted UX. The team is TypeScript/React-oriented and wants
incremental delivery with future offline-first mobile support.

## Decision to validate before implementation

Prefer an Expo + React Native + React Native Web oriented strategy
unless the foundation spike identifies a material limitation for the
required Web experience.

A monorepo with a dedicated Web framework and shared packages remains
the primary alternative if analytics-heavy Web needs justify stronger
Web specialization.

## Alternatives Considered

1.  Expo / React Native / React Native Web.
2.  Next.js Web + Expo Mobile in a monorepo with shared domain/design
    packages.
3.  Fully separate Web and Mobile applications.

## Decision criteria

-   Web responsiveness and analytics ergonomics;
-   Android/iOS delivery;
-   shared domain and UI potential;
-   developer experience;
-   testing;
-   offline evolution;
-   ecosystem maturity;
-   build/deploy complexity.

## Consequences

This ADR remains Proposed until the Foundation SDD performs the minimum
validation necessary to select the initial structure. The agent must not
silently treat the proposal as Accepted.
