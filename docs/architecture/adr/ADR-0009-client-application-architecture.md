# ADR-0009 --- Client Application Architecture

## Status

Accepted (2026-09-23, SDD-002)

## Context

SDD-002 introduces the first real screens: sign-in, sign-up, and a
protected area. The client needs navigation with access control, a way
to call the API with the generated contract types, and a server-state
pattern that avoids ad-hoc effects (ENGINEERING-GUIDELINES).

## Decision

-   **Navigation:** Expo Router with file-based routes in
    `apps/client/src/app`. Access control uses `Stack.Protected` guards
    driven by the Better Auth session: signed-out users can only reach
    `sign-in`/`sign-up`; signed-in users can only reach the `(app)`
    group. The Web build is a single-page app (`web.output: single`).
-   **API calls:** `openapi-fetch` typed by `@personalfin/api-contract`
    (ADR-0002). A middleware attaches the native session cookie.
-   **Server state:** TanStack Query. Query hooks live next to the API
    client (`src/api`). Components do not fetch in effects.
-   **Auth client:** `auth-client.ts` (Web) and `auth-client.native.ts`
    (Android/iOS) expose the same API; see ADR-0007.
-   **Configuration:** `EXPO_PUBLIC_API_URL`, validated at startup in
    `src/config.ts`.
-   **UI text:** a central `src/i18n/messages.ts` catalog in pt-BR.
    Components never hard-code user-facing strings (TD-004).
-   **Design System foundation:** theme tokens and primitives in
    `src/ui` (see DESIGN-SYSTEM.md). The palette follows the operating
    system's Light/Dark setting (TD-005).

## Alternatives Considered

1.  **Conditional rendering without a router.** Simpler now, but gives
    no URLs on the Web and does not scale to the upcoming screens.
2.  **React Navigation directly.** Expo Router is built on it and adds
    file-based routes, Web URLs, and protected route groups.
3.  **SWR or plain `fetch` in effects.** TanStack Query offers cache
    invalidation and mutation handling needed in SDD-003 to SDD-006,
    and later works with offline persistence.
4.  **An i18n library now.** Deferred until English is actually
    delivered; the central catalog keeps the later migration mechanical.

## Consequences

-   Screens stay thin: data access in `src/api`, text in `src/i18n`,
    visuals in `src/ui`.
-   Adding English requires introducing locale selection and a second
    catalog.

## References

-   SDD-002 --- Base Authentication
-   FR-104 to FR-109
-   ADR-0001, ADR-0002, ADR-0007
