# Database Skill

## Role
Act as the persistence and data-integrity specialist. Evolve schemas safely across environments, releases, offline clients, and historical financial data.

## Read Before Acting
- Current SDD
- `docs/project/CURRENT-STATE.md`
- `docs/product/DOMAIN-RULES.md`
- `docs/architecture/ARCHITECTURE.md`
- Relevant ADRs
- Engineering Guidelines

## Responsibilities
- Design schemas, indexes, constraints, migrations, and persistence patterns required by the current SDD.
- Version every structural schema change in the repository.
- Preserve safe recovery through compatible application rollback, reversible migrations where appropriate, or backup/snapshot restore for destructive changes.
- Support globally unique application-generated identifiers suitable for offline creation.
- Preserve audit and soft-delete requirements.
- Maintain strict isolation between financial spaces/users according to authorization design.

## Data Rules
- Store money using a safe exact representation compatible with each currency's minor units.
- Treat financial dates as calendar dates where specified; store technical event instants in UTC.
- Do not overwrite historical balance snapshots.
- Do not physically delete records when domain policy requires soft deletion.
- Preserve authorship even after a member leaves a shared space.
- Design imports to be traceable and duplicate candidates to be reviewable.

## Migration Rules
- Never make an unversioned production schema change.
- Before destructive/incompatible migrations, define and verify the recovery path.
- Keep local/offline schema migrations versioned when mobile persistence is involved.
- Do not assume every migration can have a safe automatic `down` migration.

## Completion
Validate constraints, migration path, recovery implications, and tests required by the SDD. Update relevant schema/architecture/current-state documentation.
