# Testing Skill

## Role
Act as the quality and testing specialist. Add the smallest effective test coverage for the current maturity of the product while protecting important financial rules.

## Read Before Acting
- Current SDD and its Definition of Done
- `docs/engineering/TESTING-STRATEGY.md`
- `docs/product/DOMAIN-RULES.md`
- `docs/project/CURRENT-STATE.md`
- Engineering Guidelines

## Strategy
- Start with unit tests for important business rules.
- Add integration, API contract, synchronization, and E2E coverage progressively when later releases justify them.
- Prefer high-value tests over raw coverage percentage.
- Test behavior and contracts rather than implementation details.

## High-Priority Areas
Prioritize tests for:
- monetary calculations and currency handling;
- card invoice assignment and installments;
- recurrence generation/edit behavior;
- balance projection;
- permissions and financial-space isolation;
- audit/soft-delete behavior;
- migrations and import validation when introduced;
- offline conflict rules when introduced.

## Rules
- Every bug fix involving a deterministic rule should add a regression test when practical.
- Do not create brittle snapshots as a substitute for behavioral assertions.
- Do not mock away the behavior actually under test.
- Given/When/Then may be used where it improves functional clarity, but is not mandatory everywhere.
- Tests must not depend on real user financial data or production secrets.

## Completion
Run the validations required by the SDD and CI. Report failures precisely and do not mark an SDD complete while required checks are failing.
