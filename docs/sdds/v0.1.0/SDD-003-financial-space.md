# SDD-003 --- First Financial Space

## Objective

Allow an authenticated user to create and enter their first Financial
Space.

## Dependencies

SDD-002 complete.

## Scope

-   Financial Space entity/model;
-   globally unique ID;
-   name;
-   owner relationship;
-   active lifecycle state;
-   create use case/API/UI;
-   list/select user's spaces at minimum needed for v0.1.0;
-   authorization ensuring only accessible spaces are returned.

## Domain constraints

Exactly one Owner. Creator becomes Owner. Multi-member collaboration is
not implemented yet.

## Non-scope

Invitations, granular RBAC UI, ownership transfer, archive/delete
workflow, shared-space collaboration.

## Acceptance

-   Authenticated user creates a space.
-   Creator is Owner.
-   Another user cannot access it.
-   User can select/enter their created space.

## Definition of Done

Migration, API contract, tests, docs, current state, and changelog
updated.
