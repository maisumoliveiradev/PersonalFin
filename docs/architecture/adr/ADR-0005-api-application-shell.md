# ADR-0005 --- API Application Shell

## Status

Accepted (2026-09-23, SDD-001)

## Context

SDD-001 requires a minimal runnable API with a health check.
ADR-0002 makes OpenAPI the source of truth for the API contract and
prefers generated TypeScript types over hand-written duplicates.
OBSERVABILITY.md requires structured logs and a health check from the
first backend stage, with no sensitive data in logs.

## Decision

-   **Runtime:** Node.js 24 LTS, running TypeScript source directly
    through Node's built-in type stripping. There is no separate
    compile step for the API. Source code is limited to erasable
    TypeScript syntax (`erasableSyntaxOnly`), and relative imports use
    explicit `.ts` extensions.
-   **HTTP framework:** Fastify 5. It provides structured JSON logging
    (pino) with request IDs and log redaction, and in-process request
    injection for tests.
-   **Contract-first OpenAPI:** the contract lives in
    `packages/api-contract/openapi.yaml`. TypeScript types are generated
    with `openapi-typescript` into
    `packages/api-contract/src/generated/schema.ts` and committed.
    `npm run contract:check` fails when the generated types are out of
    date. Route handlers type their responses with the generated types.
-   **Health check:** `GET /health` returns `{ "status": "ok" }` and
    reports liveness only; it does not expose version, environment, or
    dependency details.
-   **Configuration:** read from environment variables and validated at
    startup; see the environment strategy in `ARCHITECTURE.md`.

## Alternatives Considered

1.  **Hono.** Lighter and runtime-agnostic, but structured logging and
    redaction would need to be assembled separately.
2.  **NestJS.** Heavy framework conventions (decorators, DI container)
    that are not justified at this stage. Its decorators are also not
    erasable syntax.
3.  **Code-first OpenAPI (schema generated from route definitions).**
    Rejected to keep the contract the literal source of truth, as
    ADR-0002 states.
4.  **Compiling with `tsc` or a bundler.** Unnecessary while Node runs
    TypeScript natively; can be introduced if deployment requires it.

## Consequences

-   One less build step: `node src/main.ts` runs the API.
-   TypeScript features that emit code (enums, namespaces, parameter
    properties) cannot be used in the API.
-   `openapi-typescript` 7.13 declares a peer dependency on TypeScript 5
    while the workspace uses TypeScript 6 (pinned by Expo SDK 57). The
    root `package.json` overrides the peer to the workspace version;
    see TD-002.
-   Runtime request validation against the contract is not introduced
    yet; it is added when the first endpoint with input exists.

## References

-   SDD-001 --- Project Foundation
-   ADR-0001, ADR-0002
-   `docs/engineering/OBSERVABILITY.md`
