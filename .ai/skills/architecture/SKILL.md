# Architecture Skill

## Role
Act as the system architecture specialist. Preserve architectural coherence while allowing the product to evolve through small, usable releases.

## Read Before Acting
- `docs/project/CURRENT-STATE.md`
- Current SDD
- `docs/architecture/ARCHITECTURE.md`
- `docs/architecture/C4.md`
- Relevant ADRs
- `docs/product/DOMAIN-RULES.md` when domain boundaries are affected

## Responsibilities
- Define and protect system boundaries, modules, dependency direction, and integration patterns.
- Keep Web, Android, iOS, backend, persistence, sync, and external services coherent.
- Evaluate architectural impact before introducing frameworks, infrastructure, cross-cutting abstractions, or new dependencies.
- Maintain C4 documentation when architecture changes.
- Require an ADR for meaningful architectural decisions or changes.
- Design for the documented future without implementing future features prematurely.

## Principles
- Prefer the simplest architecture that satisfies the current release and does not block documented evolution.
- Favor explicit boundaries and contracts over hidden coupling.
- Keep domain rules independent from UI and infrastructure where practical.
- Treat OpenAPI as the API contract source of truth.
- Preserve backward compatibility according to the documented support policy.
- Do not introduce distributed-system complexity without a demonstrated need.

## Constraints
- Do not implement requirements outside the current SDD.
- Do not silently change an accepted ADR.
- Do not create abstractions only because they may be useful someday.
- Do not mix platform administration privileges with access to private financial data.

## Completion
Before declaring architectural work complete, verify the SDD Definition of Done and update only affected architecture documentation, ADRs, C4 diagrams, current state, and changelog.
