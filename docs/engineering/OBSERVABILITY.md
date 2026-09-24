# OBSERVABILITY.md

## Goal

Provide enough operational visibility to diagnose failures without
leaking private financial data.

## Progressive adoption

### Initial backend stage

-   structured logs;
-   request correlation where practical;
-   health endpoint/check;
-   error capture.

### Later

-   performance metrics;
-   service metrics;
-   tracing;
-   release/version adoption;
-   job monitoring;
-   aggregate product analytics;
-   Super Admin operational views.

## Privacy rules

Never emit passwords, tokens, secrets, full sensitive financial
payloads, or unnecessary personal data.

Aggregate product analytics should avoid exposing individual financial
information.

## Incident readiness

Operational documentation should eventually define how to identify
affected version/environment, inspect errors, rollback when safe, and
restore data when necessary.
