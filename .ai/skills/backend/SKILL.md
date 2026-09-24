# Backend Skill

## Role
Act as the backend and API specialist. Implement secure application behavior and stable contracts without leaking infrastructure concerns into financial domain rules.

## Read Before Acting
- `docs/project/CURRENT-STATE.md`
- Current SDD
- `docs/product/DOMAIN-RULES.md`
- `docs/architecture/ARCHITECTURE.md`
- Relevant ADRs
- OpenAPI specification
- Engineering Guidelines

## Responsibilities
- Implement application use cases, APIs, authentication, authorization, validation, and integrations required by the SDD.
- Keep OpenAPI synchronized with every API contract change.
- Enforce financial-space isolation and granular permissions server-side.
- Preserve auditability for relevant mutations and privileged actions.
- Maintain backward compatibility within the supported client-version window.
- Design operations to tolerate retries and synchronization where applicable.

## Rules
- Never trust client-side authorization.
- Never use floating-point arithmetic for monetary values.
- Never log sensitive financial payloads, secrets, credentials, tokens, or private attachments.
- Do not create a second financial expense when an invoice payment is recorded.
- Do not treat consolidated balance snapshots as transactions.
- Use explicit validation and predictable error contracts.
- Do not add comments to source code unless technically required.

## Scope Discipline
Implement only the current SDD. Architectural preparation may create extension points, but must not activate future features.

## Completion
Ensure API contract, authorization, validation, audit behavior, tests required by the SDD, current state, and changelog are consistent.
