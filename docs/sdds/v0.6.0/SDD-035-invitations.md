# SDD-035 --- Invitations

## Objective

Invite people into a space with a preset, through a secure single-use
link (FR-007; email delivery deferred as TD-011).

## Scope

-   API: create (email, preset or permissions), list pending, cancel,
    view by token, and accept invitations; tokens are hashed at rest,
    single use, expire after 7 days, and only the user with the invited
    email can accept.
-   Client: invite screen that shows the link once; accept screen at
    `/invite/{token}`.

## Non-scope

Email sending, reminders.

## Acceptance

-   An expired, cancelled, or used token never grants access; accepting
    creates exactly one membership; everything is audited.

## Definition of Done

Migration, OpenAPI, tests, journey, docs, TD-011, changelog.
