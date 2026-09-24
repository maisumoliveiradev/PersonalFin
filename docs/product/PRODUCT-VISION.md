# PRODUCT-VISION.md

## 1. Document Purpose

This document defines the long-term product vision for the personal finance platform.

It describes **what the product aims to become**, the problems it intends to solve, its guiding principles, major capabilities, and intended user experience.

This is not an implementation specification.

Detailed business rules belong in `DOMAIN-RULES.md`, accepted functional requirements belong in `REQUIREMENTS.md`, delivery sequencing belongs in `ROADMAP.md`, and technical decisions belong in architecture documents and ADRs.

---

## 2. Product Vision

Build a personal finance platform that transforms fragmented financial control into a structured, reliable, understandable, and progressively intelligent financial workspace.

The product should allow users to organize their financial life across personal, family/home, and business contexts while maintaining a clear distinction between:

- what has already happened;
- what is expected to happen;
- what the user's current financial position is;
- what future commitments exist;
- what the projected financial position may become.

The platform should prioritize **clarity, control, historical integrity, and trustworthy data** over excessive automation.

The product must remain useful for simple financial organization while being capable of evolving into a richer analytical platform without forcing advanced complexity on every user.

---

## 3. Product Problem

Personal financial control frequently becomes fragmented across:

- spreadsheets;
- banking applications;
- credit-card applications;
- notes;
- recurring-payment reminders;
- installment tracking;
- manual calculations;
- disconnected financial reports.

This fragmentation makes seemingly simple questions difficult to answer consistently:

- How much money do I actually have available today?
- How much have I spent this month?
- What expenses are still expected?
- How much income is still expected?
- What is already committed for future months?
- What will my projected balance be?
- Which categories are consuming the most money?
- How much of my spending is concentrated on credit cards?
- How is my financial position changing over time?
- Which expenses are growing?
- How do current results compare with previous periods?

The product should centralize these questions without requiring the user to maintain the complexity of a traditional accounting system.

---

## 4. Product Principles

### 4.1 Simple First, Powerful When Needed

The default experience should remain approachable.

Advanced capabilities should be progressively disclosed rather than presented all at once.

Users should be able to begin with simple financial tracking and progressively adopt:

- forecasts;
- projections;
- cards;
- installments;
- recurring transactions;
- debts;
- goals;
- analytics;
- custom metrics;
- shared spaces;
- multi-currency workflows.

---

### 4.2 Financial Data Must Be Trustworthy

Financial information must never be silently distorted.

The product should favor explicit user decisions when uncertainty could change financial meaning.

Historical information should remain traceable.

Edits, deletions, imports, synchronization conflicts, administrative access, and other relevant operations should preserve appropriate auditability.

---

### 4.3 Observed Reality and Calculated Projection Are Different

The product must clearly distinguish between:

- actual financial events;
- expected financial events;
- manually observed balances;
- calculated future projections.

A manually informed consolidated balance is an observation of reality.

A projected balance is a calculation.

These concepts must never be presented as if they were equivalent.

---

### 4.4 Historical Integrity Matters

Financial history should not be rewritten unintentionally.

The product should preserve the meaning of historical:

- transactions;
- categories;
- balances;
- exchange rates;
- card invoices;
- installments;
- permissions;
- audit events.

When historical reclassification is possible, it should be intentional and explicit.

---

### 4.5 The User Remains in Control

Automation should assist the user rather than silently make financial decisions.

Examples:

- suspected import duplicates should be presented for confirmation;
- OCR may extract objective information but the user reviews before saving;
- synchronization conflicts involving meaningful competing changes require resolution;
- financial classifications should not be invented when certainty is insufficient.

---

### 4.6 One Product, Multiple Experience Levels

The same financial model should support different levels of complexity.

The product should offer experience profiles such as:

- **Basic**
- **Intermediate**
- **Advanced**

These profiles affect the default visibility and complexity of the interface, not the underlying correctness of the data.

A user may change the experience level later.

---

### 4.7 Analytics Should Be Explainable

Financial indicators should have documented definitions.

A metric should have a clear:

- meaning;
- formula;
- data source;
- filtering behavior;
- interpretation.

The same metric should not produce different answers across Web, Mobile, exports, and reports.

The product should support financial analysis while remaining useful as a learning environment for Data & Analytics.

---

## 5. Target Users

The product is designed as a multi-user platform even when the initial deployment may have a single primary user.

It should support individuals who want to manage:

- personal finances;
- household or family finances;
- business/PJ finances;
- shared financial contexts.

A user may participate in multiple financial spaces.

---

## 6. Financial Spaces

Financial information is organized into **Financial Spaces**.

Examples:

- Personal
- Family
- Home
- Company / PJ

Each space represents an independent financial context.

A financial space may be private or shared.

Each space has exactly one Owner.

Shared spaces may contain other members with granular permissions.

The platform should support predefined permission profiles while allowing permissions to be customized.

Examples of permission profiles may include:

- Viewer;
- Contributor;
- Administrator.

Permissions should ultimately govern capabilities rather than relying exclusively on fixed roles.

Transactions created inside a shared space belong to the space, not to the individual who created them.

---

## 7. Core Financial Model

The product should organize financial information around several distinct concepts.

### 7.1 Income

Income may be:

- one-time;
- recurring;
- pending;
- received;
- planned for future periods.

Recurring income should support independent occurrences so exceptional months can be changed without rewriting the entire recurrence.

---

### 7.2 Expenses

Expenses may be:

- one-time;
- recurring;
- pending;
- paid;
- card-based;
- installment-based.

Each transaction belongs to one category and may optionally belong to a subcategory.

Transactions may also support:

- multiple tags;
- notes;
- related links;
- attachments.

---

### 7.3 Consolidated Balance

The product does not require users to maintain individual bank-account balances as the primary balance model.

Instead, each financial space can maintain a **consolidated current balance** informed manually by the user.

A balance update creates a historical snapshot rather than overwriting previous information.

This enables analysis such as:

- balance evolution;
- intramonth balance oscillation;
- minimum and maximum observed balance;
- beginning versus ending balance;
- time since last balance update.

The application may periodically ask:

> What is your balance today?

The frequency should be configurable.

---

### 7.4 Projection

Future financial projection should combine:

- current consolidated balance;
- expected income;
- future expenses;
- recurring commitments;
- card commitments;
- debt commitments where applicable.

The system should make a clear visual distinction between:

- **Realized**
- **Forecast**
- **Projection**

Users should be able to navigate future periods and understand how known commitments affect expected financial position.

---

## 8. Categories and Classification

The product should support customizable:

- categories;
- subcategories;
- tags.

New financial spaces should receive a useful but concise default category structure.

Some categories may include default subcategories.

Users may:

- create;
- rename;
- reorganize;
- archive;
- customize

their classification structure.

Used categories should preserve historical meaning.

When reorganizing classifications, the user should be able to choose whether the change applies only going forward or also reclassifies historical data.

Tags may cross category boundaries and may be used in:

- filters;
- searches;
- reports;
- dashboard analysis.

---

## 9. Credit Cards

Credit cards should be modeled as first-class financial entities.

The product should support:

- card registration;
- card limits;
- closing dates;
- due dates;
- invoices;
- purchases;
- installment purchases;
- invoice status;
- partial invoice payments;
- historical card-limit changes.

Card purchases should be financially recognized in the month of the invoice to which they belong.

Invoice payment should not create a duplicate expense when the purchases already represent the expense.

The system should automatically determine the expected invoice using card configuration while allowing manual correction for issuer-specific exceptions.

Card limit usage and available limit should be calculated from known card information without requiring advanced issuer-specific future-limit simulation.

---

## 10. Installments

Installment purchases should allow the user to provide information such as:

- total purchase value;
- number of installments;
- first invoice.

The system should generate the future installment schedule.

The original purchase remains the source of the installment relationship.

Future installments may be cancelled when appropriate without erasing already realized history.

---

## 11. Recurring Transactions

Income and expenses may be recurring.

A recurrence represents the rule that creates or organizes occurrences.

Each occurrence must remain independently editable.

The product should eventually support operations such as:

- edit this occurrence;
- edit this and following occurrences;
- edit the recurrence.

Recurrences may:

- have no end date;
- have a defined end date.

When recurrence dates fall on non-business days, the recurrence may define whether to:

- keep the original date;
- move to the previous business day;
- move to the next business day.

Business-day calculations should be capable of considering Brazilian:

- national holidays;
- state holidays;
- municipal holidays,

based on configured locality.

---

## 12. Debts and Loans

Debts and loans should exist separately from:

- ordinary recurring expenses;
- card installment purchases.

The initial conceptual model should remain simple and focus on:

- original debt;
- installments;
- paid installments;
- remaining installments;
- outstanding balance;
- payoff progress.

The product should support early-amortization scenarios without automatically changing real financial data.

Users should be able to compare scenarios such as:

> If I prepay this amount, how much commitment remains?

A simulation becomes real data only after explicit confirmation.

The platform is not intended to become a complete banking amortization engine unless future product needs justify that evolution.

---

## 13. Financial Goals

Users should be able to define financial goals with:

- target value;
- manually updated accumulated amount;
- progress.

A goal may belong to:

- a specific financial space;
- the account globally.

Goals should not automatically reduce projected available balance in the initial model.

---

## 14. Dashboard and Analytics

Analytics are a major product capability.

The dashboard should evolve to provide views such as:

- current consolidated balance;
- balance evolution;
- income versus expenses;
- spending by category;
- spending by tags;
- monthly evolution;
- card spending;
- future commitments;
- projected cash flow;
- period comparisons;
- financial indicators.

The dashboard should clearly distinguish actual, expected, and projected information.

Users should be able to compare predefined periods such as:

- current month versus previous month;
- current period versus the equivalent previous-year period.

Useful derived metrics may eventually include:

- month-over-month variation;
- savings rate;
- moving averages;
- spending concentration;
- other documented financial indicators.

---

## 15. Custom Metrics

The product should provide built-in financial indicators with transparent formulas.

Advanced users should also be able to create custom metrics.

The default creation experience should use a simple visual builder.

An advanced mode may support validated expressions such as:

`(income - expenses) / income * 100`

Custom expressions must never execute arbitrary code.

---

## 16. Personalized Dashboard

Dashboards should be configurable per user.

Users should eventually be able to:

- choose cards and charts;
- hide components;
- reorder components;
- configure supported widgets;
- save their personal layout.

A user's dashboard customization must not unexpectedly change another user's dashboard in a shared financial space.

---

## 17. Search and Filtering

The product should provide a simple global search by default.

Advanced search should be available when needed.

Advanced filters may include:

- period;
- financial space;
- category;
- subcategory;
- tags;
- status;
- transaction type;
- other relevant dimensions.

The advanced experience should remain optional so basic usage stays lightweight.

---

## 18. Notifications and Reminders

The product should support:

- in-app notifications;
- mobile push notifications.

Notifications should be configurable.

Potential automatic alerts include:

- invoice due dates;
- upcoming expenses;
- recurring commitments;
- negative projected balance;
- balance-update reminders.

Users should also be able to create financial reminders linked to relevant entities.

Reminder timing should support configurable presets such as:

- on the day;
- one day before;
- three days before;
- seven days before.

Multiple reminders may be configured where appropriate.

---

## 19. Quick Entry

Mobile usage should prioritize fast financial capture.

A global quick-action entry point should allow actions such as:

- New Expense;
- New Income;
- Update Balance;
- New Card Purchase;
- Scan Receipt.

Quick actions should be configurable.

Transaction forms should begin with the minimum necessary information and progressively expose optional information.

Reusable transaction templates may prefill common values and may be associated with quick actions.

---

## 20. Attachments and Document Capture

Transactions should support image and PDF attachments.

The architecture should allow future OCR/AI-assisted document capture.

Document extraction should focus on objective information such as:

- amount;
- date;
- establishment or description.

AI should not autonomously infer financial categories, tags, or subjective financial decisions in the initial product direction.

Extracted information must be reviewed before saving.

Users should be able to capture documents through:

- camera;
- existing images;
- existing PDFs.

---

## 21. Artificial Intelligence

AI is a supporting capability, not the decision-maker of the financial system.

The intended initial AI scope is document reading and structured-data extraction.

The product vision does not require:

- a financial chatbot;
- autonomous financial advice;
- automatic subjective categorization;
- AI-generated financial decisions.

Financial analytics should remain deterministic and explainable unless a future product decision explicitly expands AI usage.

---

## 22. Multi-Currency

The target platform supports multiple currencies within the same financial space.

Transactions must preserve:

- original amount;
- original currency;
- applied exchange rate when conversion is needed.

The account has a configurable global base currency, initially expected to be BRL.

Changing the base currency should not destroy original transaction information.

Exchange rates should support:

- automatic daily rates from an external source;
- manual override.

Historical applied exchange rates must remain preserved.

---

## 23. Imports

The product should support recurring import of:

- CSV;
- Excel.

The architecture should remain capable of supporting future financial-statement formats such as OFX.

Automatic banking integration is not required for the initial product direction.

Import workflows should prioritize:

- validation;
- preview;
- correction;
- duplicate detection;
- explicit confirmation.

Potential duplicates should not be silently discarded.

---

## 24. Initial Spreadsheet Migration

The existing financial spreadsheet is the initial historical data source for the product.

Its information should be migrated rather than treated merely as visual reference.

The migration should preserve meaningful historical information and use a controlled process:

`Read → Validate → Preview → Resolve → Confirm → Import`

Ambiguous source data must not be guessed when the ambiguity could alter financial meaning.

After the migration has been validated, the application becomes the official source of truth.

The original spreadsheet should remain preserved for historical traceability and backup of the migration source.

---

## 25. Export and Portability

Users should be able to export financial information for analysis and reporting.

Target formats include:

- CSV;
- Excel;
- PDF reports.

Exports should support relevant filters such as:

- period;
- financial space;
- selected dimensions.

Reporting exports are distinct from a full portable account backup.

The long-term product should support a complete user backup that can later be restored or imported by the system.

---

## 26. Offline-First Mobile Experience

The mobile application should ultimately support offline-first workflows.

Users should be able to create and edit supported information without connectivity.

When connectivity returns, synchronization should happen automatically.

The interface should communicate relevant states such as:

- offline;
- pending changes;
- synchronizing;
- synchronized;
- synchronization error.

The product should avoid exposing unnecessary synchronization complexity during normal operation.

---

## 27. Conflict Resolution

Synchronization should use a hybrid conflict strategy.

Safe independent changes may be merged automatically.

Meaningful competing changes to the same information require explicit resolution.

Deletion-versus-edit conflicts must not silently:

- discard the edit;
- restore the deleted record.

The user should be able to understand the conflict and choose the intended result.

Conflict history should remain auditable.

---

## 28. Authentication

The target product supports:

- email/password;
- password recovery;
- email verification;
- Google authentication;
- Apple authentication.

The architecture should remain prepared for future MFA/2FA.

Authentication capabilities should be introduced incrementally rather than delivered as one large initial feature.

---

## 29. Device and Local Security

Users may maintain multiple active sessions across devices.

The product should provide a Connected Devices experience capable of showing relevant session/device information and supporting remote logout.

New-device access may generate a security notification.

Mobile applications should support optional local protection using:

- biometrics;
- application PIN fallback.

When local protection is enabled, the intended experience is to protect access when the application is opened or returns from the background, subject to platform constraints.

---

## 30. Privacy

Users should have access to a Privacy and Data area.

The product should allow users to:

- view relevant personal data;
- edit profile information;
- export their data;
- inspect relevant sessions/accesses;
- request account deletion.

Account deletion should use a grace period before final deletion.

The user should be offered a full backup/export before irreversible deletion.

---

## 31. Auditability

Relevant actions should generate an audit history.

Examples include:

- record creation;
- relevant edits;
- deletion;
- restoration;
- permission changes;
- ownership changes;
- sensitive administrative access.

Audit information should identify, when applicable:

- actor;
- timestamp;
- action;
- affected entity;
- relevant before/after information.

Audit history should remain available while the account exists, subject to final account-deletion and retention policies.

---

## 32. Deletion and Recovery

Important financial records should favor recoverable deletion.

The product should support soft deletion where appropriate.

Financial spaces should support:

- active state;
- archived state;
- deletion/recovery period.

Archived spaces preserve:

- history;
- reports;
- audit information.

They should not accept new financial activity until reactivated.

Archived spaces should be excluded from current dashboards by default but remain available through filters and historical analysis.

---

## 33. Shared Spaces and Collaboration

Shared financial spaces should support controlled collaboration.

Users may be invited by email.

A person without an account may create one and then accept the invitation.

Invitations should support appropriate lifecycle controls such as expiration and cancellation.

A financial space has exactly one Owner.

The Owner may transfer ownership.

An Owner must transfer ownership before leaving a shared space when other members remain.

Records created by members remain in the financial space after those members leave or lose access.

Original authorship remains preserved for audit purposes.

---

## 34. Administrative Platform

The target platform includes a Super Admin capability distinct from financial-space administration.

Super Admin responsibilities may evolve to include:

- technical observability;
- platform administration;
- aggregate product analytics.

Examples include:

- application errors;
- crashes;
- service health;
- performance;
- application versions;
- registered-user counts;
- account statuses;
- jobs;
- system configuration;
- release adoption;
- feature adoption;
- aggregate active-user metrics.

Aggregate product analytics must not expose individual private financial information unnecessarily.

---

## 35. Support Access

Super Admin must not have a silent master key to private financial data.

If support requires access to a user's financial information, the target authorization model should support:

- explicit user authorization;
- mandatory access reason;
- scoped permissions;
- expiration;
- full audit trail.

Users should be able to determine when authorized support access occurred and who performed it.

---

## 36. Backup and Recovery

The product should eventually provide two distinct recovery layers.

### Infrastructure Recovery

Automatic database/infrastructure backups with:

- retention;
- documented recovery procedures;
- controlled restoration.

### User Portability

A complete user-level backup/export capable of later restoration or import.

Reporting exports such as CSV, Excel, and PDF are not substitutes for complete backup.

---

## 37. Web and Mobile

The target platforms are:

- Web;
- Android;
- iOS.

The product should aim for functional parity while adapting the interaction model to each platform.

Mobile should emphasize:

- speed;
- quick capture;
- native interaction patterns.

Web should take advantage of larger screens for:

- analytics;
- management;
- historical exploration;
- detailed configuration.

The Web interface should remain responsive and usable on smaller screens without needing to reproduce the native mobile interface exactly.

---

## 38. Design System

The product should maintain its own incremental Design System.

The Design System should begin with necessary foundations such as:

- colors;
- typography;
- spacing;
- radius;
- elevation/shadows;
- essential components.

It should grow according to actual product needs rather than attempting to define every possible component before implementation.

---

## 39. Accessibility

WCAG 2.2 AA is the accessibility reference for the product.

Accessibility should be incorporated progressively into the components and interfaces that are implemented.

Accessibility is a product-quality requirement rather than a final-stage visual polish task.

---

## 40. Theme

The product should support:

- Light;
- Dark;
- System.

Theme preference should belong to the user profile and synchronize across supported devices when appropriate.

---

## 41. Localization

The product should launch with support for:

- Brazilian Portuguese (`pt-BR`);
- English.

Localization should include appropriate presentation of:

- text;
- dates;
- numbers;
- currency formatting.

Locale presentation must remain distinct from the user's configured financial base currency.

---

## 42. Product Data Quality

The product should detect meaningful data-quality problems without turning normal financial usage into a governance workflow.

Potential issues include:

- invalid values;
- inconsistent dates;
- broken references;
- missing required relationships;
- incomplete imported data.

Only issues that compromise integrity should necessarily block an operation.

Warnings may be used for recoverable or reviewable situations.

---

## 43. Financial Metrics as a Shared Language

Metrics should be centralized conceptually so that all product surfaces share the same definitions.

For example, a metric such as:

> Realized Expenses

must have the same financial meaning in:

- Web;
- Android;
- iOS;
- exports;
- reports;
- dashboards.

The product should not allow each interface to invent its own interpretation of financial indicators.

---

## 44. Experience Profiles

The product should provide progressive experience profiles.

### Basic

Focus on:

- current financial information;
- realized income;
- realized expenses;
- essential indicators.

### Intermediate

Adds emphasis on:

- upcoming commitments;
- forecasts;
- comparisons;
- financial planning.

### Advanced

Adds emphasis on:

- projections;
- detailed analytics;
- advanced indicators;
- custom metrics;
- richer dashboard configuration.

During onboarding, the product may ask a short set of questions and recommend an experience profile.

The recommendation should be explainable and optional.

The user remains free to select another profile and change it later.

---

## 45. Product Evolution Strategy

The product must be developed through **small, usable, verifiable increments**.

The existence of a long-term capability in this vision does not authorize an implementation agent to build it before its scheduled SDD.

The first usable milestone is intentionally small.

### v0.1.0 Product Milestone

The first usable product should allow a user to:

1. authenticate;
2. create the first financial space;
3. receive an initial category structure;
4. manually register an income or expense.

This milestone proves the core vertical path without requiring the complete financial platform.

Subsequent releases should progressively add capabilities.

---

## 46. Product Documentation Philosophy

Three concepts must remain clearly separated.

### Future Vision

What the product is intended to become.

This document primarily represents that layer.

### Current State

What is actually implemented today.

Defined in:

`docs/project/CURRENT-STATE.md`

### Delivery History

What changed across releases.

Defined through:

- SDD history;
- changelog;
- ADR history;
- release/version history.

Agents and developers must never confuse future vision with implemented behavior.

---

## 47. Non-Goals for the Initial Product

The initial product is not intended to be:

- a complete banking platform;
- a replacement for financial institutions;
- an accounting ERP;
- a tax/accounting engine;
- a universal bank-integration platform;
- a fully autonomous financial advisor;
- an AI financial decision-maker;
- a complete business-intelligence platform;
- a universal spreadsheet interpreter;
- a complete SAC/Price amortization engine;
- a complex workflow-approval platform.

Some adjacent capabilities may evolve later if real usage demonstrates value.

---

## 48. Success Criteria

The product is succeeding when users can trust it to answer financial questions consistently without maintaining parallel manual calculations.

Long-term success means the user can understand:

- current financial position;
- historical financial behavior;
- upcoming commitments;
- projected future position;
- meaningful spending patterns;
- financial evolution over time.

The experience should remain understandable for basic users while providing progressively deeper analytical capability for advanced users.

Most importantly, the platform should allow financial complexity to grow **without making basic financial control complex**.
