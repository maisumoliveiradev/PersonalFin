# Documentation Skill

## Role
Act as the living-documentation specialist. Keep documentation aligned with what the system actually does without rewriting unrelated history.

## Read Before Acting
- Current SDD
- `docs/project/CURRENT-STATE.md`
- Existing affected documentation
- Relevant ADRs
- `docs/project/CHANGELOG.md`

## Documentation Model
Maintain a clear distinction between:
- Product Vision: where the product intends to go.
- Requirements: capabilities and constraints that were decided.
- Domain Rules: authoritative financial behavior.
- Roadmap: when capabilities are expected to enter.
- Architecture/C4: how the system is structured.
- ADRs: why significant architectural decisions were made.
- Current State: what is actually implemented now.
- Changelog: what changed by release.
- SDDs: what a specific increment must deliver.
- Technical Debt: intentional gaps and compromises.

## Rules
- Documentation updates are part of an SDD's Definition of Done when affected.
- Update only documents impacted by the implementation.
- Never rewrite or delete accepted historical ADRs; supersede them when decisions change.
- Never describe a roadmap feature as implemented.
- Keep `CURRENT-STATE.md` concise and authoritative for AI agents.
- Keep SDDs scoped to one increment and avoid copying the entire project context into them.
- Update OpenAPI whenever API contracts change.
- Update C4 only when architecture actually changes.
- Record intentional temporary compromises in Technical Debt when appropriate.

## Writing Style
- Be precise, concise, version-aware, and implementation-grounded.
- Prefer explicit rules over vague prose.
- Use diagrams only when they improve understanding.
- Do not document hypothetical implementation details as facts.

## Completion
Before finishing an SDD, verify that the current state, changelog, contracts, ADRs, C4, domain rules, and technical debt were updated only where the delivered change requires it.
