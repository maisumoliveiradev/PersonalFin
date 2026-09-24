# ADR-0004 --- Financial Dates and Technical Timestamps

## Status

Accepted

## Context

Financial dates represent calendar meaning and must not change when
users/devices cross timezones. Audit/security events represent real
instants.

## Decision

Store financial dates as calendar dates without timezone semantics.

Store audit, security, and technical events as UTC instants.

Use the user's configured timezone for display and time-based
notifications.

## Consequences

Client/server serialization must preserve date-only values without
converting them through local midnight instants.
