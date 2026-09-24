# ROADMAP.md

## Purpose

This roadmap sequences product evolution. It is not permission to
implement future items early.

## v0.1.0 --- Core Vertical Slice

Goal: prove the smallest usable end-to-end financial workflow.

-   repository/project foundation;
-   base authentication;
-   first Financial Space;
-   default categories/subcategories;
-   manual Income/Expense creation;
-   minimal transaction list/detail necessary to validate the flow;
-   initial unit tests for critical rules;
-   CI baseline;
-   living documentation baseline.

## v0.2.0 --- Core Financial Control

-   transaction edit and soft delete;
-   category management;
-   transaction status;
-   basic filters/search;
-   consolidated balance snapshots;
-   balance update prompt;
-   basic current-month dashboard.

## v0.3.0 --- Planning and Recurrence

-   recurring income/expenses;
-   independent occurrences;
-   future commitments;
-   Realized vs Forecast vs Projection;
-   monthly projection;
-   business-day adjustment foundation.

## v0.4.0 --- Credit Cards

-   cards;
-   limits;
-   invoice assignment;
-   invoices;
-   installment purchases;
-   invoice settlement;
-   partial payments;
-   card analytics.

## v0.5.0 --- Analytics

-   richer dashboard;
-   period comparisons;
-   category/tag analytics;
-   metric catalog;
-   dashboard personalization;
-   Basic/Intermediate/Advanced experience profiles.

## v0.6.0 --- Collaboration

-   shared Financial Spaces;
-   invitations;
-   permission presets;
-   granular RBAC;
-   ownership transfer;
-   member lifecycle;
-   audit expansion.

## v0.7.0 --- Mobile Resilience

-   offline-capable local persistence;
-   synchronization;
-   conflict resolution;
-   local schema migrations;
-   visible sync states;
-   minimum-supported-version policy.

## v0.8.0 --- Debts, Goals, and Reminders

-   debts/loans;
-   amortization scenarios;
-   financial goals;
-   in-app reminders;
-   push notification foundation.

## v0.9.0 --- Import, Export, and Data Portability

-   reusable CSV/Excel importer;
-   duplicate review;
-   initial spreadsheet migration tooling;
-   CSV/Excel exports;
-   PDF reports;
-   portable backup foundation.

## v0.10.0 --- Multi-Currency

-   transaction currencies;
-   base currency;
-   FX provider integration;
-   manual rate override;
-   historical rate preservation.

## v0.11.0 --- Documents and OCR

-   attachments;
-   camera/image/PDF capture;
-   OCR/AI extraction;
-   user review flow.

## v0.12.0 --- Platform Administration

-   Super Admin foundation;
-   health/operations views;
-   aggregate product analytics;
-   support-access authorization model.

## Later evolution

-   Google authentication;
-   Apple authentication;
-   MFA/2FA;
-   advanced custom metrics;
-   global patrimonial dashboard;
-   OFX import;
-   richer observability/tracing;
-   automated mobile release pipeline;
-   full user backup restore;
-   capabilities justified by real product usage.

## Roadmap rule

Versions may be adjusted as implementation teaches us more. When
sequencing changes, update this roadmap and create ADRs only when the
change represents an architectural decision.
