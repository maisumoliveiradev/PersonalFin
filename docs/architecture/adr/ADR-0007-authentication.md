# ADR-0007 --- Authentication with Better Auth

## Status

Accepted (2026-09-23, SDD-002). The project owner chose this option.

## Context

SDD-002 requires email/password sign-up, sign-in, sign-out, session
restoration, and server-side identity validation for protected API
operations. The roadmap later adds email verification, password
recovery, Google, Apple, MFA readiness, multiple devices, and remote
session revocation (FR-011, FR-012).

The project owner does not want paid or hosted services that can bill
unexpectedly.

## Decision

-   Use **Better Auth** (open source library) inside the API process,
    storing users, credentials, sessions, and verification records in
    the project's PostgreSQL database (ADR-0008). There is no external
    identity provider.
-   Auth endpoints are served by Better Auth under `/api/auth/*` through
    a Fastify bridge (`apps/api/src/routes/auth.ts`). Clients consume
    them through the Better Auth client, not through the OpenAPI
    contract. The application contract (`openapi.yaml`) covers only
    application endpoints.
-   **Sessions** are opaque, database-backed tokens. The cookie
    `personalfin.session_token` is `HttpOnly` and signed by Better
    Auth. It is marked `Secure` when `BETTER_AUTH_URL` uses HTTPS.
    -   Web: the browser stores the cookie; requests use
        `credentials: 'include'`.
    -   Native: the `@better-auth/expo` client stores the cookie in
        `expo-secure-store` (Keychain / Keystore) and sends it in the
        `Cookie` header.
-   **Protected API routes** are registered inside a Fastify scope whose
    `preHandler` resolves the session server-side and answers
    `401 UNAUTHENTICATED` when absent. Protection is deny-by-default for
    every route in that scope.
-   User and session IDs are PostgreSQL UUIDs (`generateId: 'uuid'`).
-   Password hashing, password length rules (8--128), and rate limiting
    (enabled in production) use Better Auth defaults. Better Auth
    telemetry is explicitly disabled.
-   Allowed browser origins and app schemes come from
    `TRUSTED_ORIGINS`; CORS allows only its HTTP(S) entries, with
    credentials.

## Alternatives Considered

1.  **Own implementation** (Node `scrypt` + session table). Fewer
    dependencies, but more security-sensitive code to maintain and more
    work for verification, recovery, social login, and MFA.
2.  **Hosted providers** (Supabase Auth, Clerk, Firebase Auth, Auth0).
    Rejected: external billing and data residency outside the project
    database.
3.  **JWT access/refresh tokens.** Harder to revoke per device;
    database sessions make remote revocation (FR-012) direct.

## Consequences

-   Future auth capabilities (verification, recovery, Google, Apple,
    2FA, session listing/revocation) are enabled through Better Auth
    configuration and plugins, each in its own SDD.
-   Better Auth owns the `user`, `session`, `account`, and
    `verification` tables. Their schema changes are captured as
    versioned SQL migrations generated with `npm run auth:schema`
    (see ADR-0008).
-   Cookies require the Web client and API to be on the same site
    (for example `app.example.com` and `api.example.com`, or `localhost`
    for both in development).
-   Auth endpoints are not described in `openapi.yaml`.
-   Sign-up answers `422 USER_ALREADY_EXISTS` for an existing email,
    which reveals whether an email is registered (TD-007).

## References

-   SDD-002 --- Base Authentication
-   FR-011, FR-012, NFR-001, NFR-002
-   ADR-0002, ADR-0008
