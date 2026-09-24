# FUNDATION.md

> Project bootstrap instruction. The filename intentionally follows the
> requested project convention. Its purpose is repository
> **foundation**, not product-feature implementation.

## Objective

Create the initial VS Code repository structure and place the provided
documentation/skills in their canonical locations before any SDD
implementation begins.

Do not implement product features while executing this file.

## Expected repository structure

``` text
.
├── AGENTS.md
├── FUNDATION.md
├── .ai/
│   └── skills/
│       ├── architecture/SKILL.md
│       ├── backend/SKILL.md
│       ├── database/SKILL.md
│       ├── documentation/SKILL.md
│       ├── financial-domain/SKILL.md
│       ├── frontend/SKILL.md
│       ├── security/SKILL.md
│       └── testing/SKILL.md
├── docs/
│   ├── README.md
│   ├── product/
│   │   ├── PRODUCT-VISION.md
│   │   ├── REQUIREMENTS.md
│   │   ├── DOMAIN-RULES.md
│   │   └── ROADMAP.md
│   ├── architecture/
│   │   ├── ARCHITECTURE.md
│   │   ├── C4.md
│   │   └── adr/
│   │       ├── README.md
│   │       ├── ADR-0001-platform-strategy.md
│   │       ├── ADR-0002-api-contract.md
│   │       ├── ADR-0003-money-representation.md
│   │       └── ADR-0004-financial-dates.md
│   ├── engineering/
│   │   ├── ENGINEERING-GUIDELINES.md
│   │   ├── TESTING-STRATEGY.md
│   │   ├── GIT-WORKFLOW.md
│   │   ├── DESIGN-SYSTEM.md
│   │   ├── OBSERVABILITY.md
│   │   └── TECHNICAL-DEBT.md
│   ├── project/
│   │   ├── CURRENT-STATE.md
│   │   └── CHANGELOG.md
│   └── sdds/
│       ├── README.md
│       └── v0.1.0/
│           ├── SDD-001-project-foundation.md
│           ├── SDD-002-authentication-base.md
│           ├── SDD-003-financial-space.md
│           ├── SDD-004-default-categories.md
│           ├── SDD-005-manual-transaction.md
│           ├── SDD-006-transaction-list.md
│           └── SDD-007-release-validation.md
```

## Instructions for the coding agent

1.  Create the directory structure exactly as required if it does not
    already exist.
2.  Preserve all supplied Markdown files.
3.  Do not rewrite their contents merely for formatting.
4.  Do not initialize product code from assumptions.
5.  Read `AGENTS.md`.
6.  Read `docs/project/CURRENT-STATE.md`.
7.  Read `docs/sdds/v0.1.0/SDD-001-project-foundation.md`.
8.  Inspect `ADR-0001-platform-strategy.md`.
9.  Only then begin the SDD-001 foundation investigation/implementation.

## Foundation decision checkpoint

Before generating the application workspace, SDD-001 must validate the
platform strategy proposed by ADR-0001.

The agent should compare at minimum:

-   Expo + React Native + React Native Web;
-   Next.js Web + Expo Mobile monorepo with shared packages.

Evaluate against this project's actual needs rather than generic
preferences.

The result must either:

-   accept ADR-0001 with a concrete structure; or
-   supersede it with a new ADR explaining the alternative.

## Repository bootstrap

After the platform decision is accepted, SDD-001 may initialize the
actual application/workspace directories appropriate to that decision.

Do not pre-create speculative `apps/`, `packages/`, backend frameworks,
database tooling, or cloud infrastructure before that decision.

## First implementation sequence

Execute strictly in order:

1.  SDD-001 --- Project Foundation
2.  validate and update documentation;
3.  SDD-002 --- Base Authentication
4.  validate and update documentation;
5.  SDD-003 --- First Financial Space
6.  validate and update documentation;
7.  SDD-004 --- Initial Categories
8.  validate and update documentation;
9.  SDD-005 --- Manual Income and Expense
10. validate and update documentation;
11. SDD-006 --- Transaction List
12. validate and update documentation;
13. SDD-007 --- v0.1.0 Release Validation

Do not ask the agent to implement all SDDs in one prompt.

## Suggested first Codex prompt

``` text
Read AGENTS.md, docs/project/CURRENT-STATE.md, and
docs/sdds/v0.1.0/SDD-001-project-foundation.md.

Load only the relevant skills.

Analyze the repository and execute only SDD-001.

Before initializing the application structure, resolve the decision checkpoint in
ADR-0001-platform-strategy.md based on the documented product requirements.

Do not implement authentication, Financial Spaces, categories, transactions, or
any later roadmap capability.

At the end, run the required validations and update only the documentation
affected by SDD-001.
```

## Completion

Foundation preparation is complete when:

-   the documentation tree exists;
-   agent skills exist;
-   `AGENTS.md` is at repository root;
-   all v0.1.0 SDDs are available;
-   `CURRENT-STATE.md` still correctly states that no product capability
    exists;
-   the repository is ready to begin SDD-001.

At that point, stop. Product implementation begins only through SDD-001.
