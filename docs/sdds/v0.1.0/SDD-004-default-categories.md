# SDD-004 --- Initial Categories

## Objective

Provide a useful initial category structure automatically for a new
Financial Space.

## Dependencies

SDD-003 complete.

## Scope

-   Category and Subcategory models;
-   concise default catalog;
-   creation/seed during Financial Space onboarding;
-   read API/use case;
-   category selection data for upcoming transaction form.

## Suggested initial catalog

Keep deliberately small. Examples may include Housing, Food, Transport,
Health, Education, Leisure, Services, Income, and Other, with only
useful subcategories.

## Non-scope

Full category-management UI, historical reclassification, archive
workflow, bulk operations.

## Acceptance

-   New space receives defaults exactly once.
-   Categories belong to the space.
-   User cannot read another user's space categories.
-   Seed is idempotent.

## Definition of Done

Schema/API/tests/docs updated; catalog documented; current
state/changelog updated.
