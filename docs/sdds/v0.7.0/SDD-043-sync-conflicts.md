# SDD-043 --- Synchronization Conflict Resolution

## Objective

Resolve concurrent changes without silently discarding either side
(FR-094 to FR-096, DR-062 to DR-065, DR-089, DR-090).

## Scope

-   Domain: three-way classification of base, local, and server
    transaction fields (independent, same-field, edit versus delete,
    delete versus edit).
-   Client sync:
    - independent changes are merged automatically and re-sent against
      the current version;
    - other conflicts become entries that need a decision;
    - a resolution screen shows the local and current values per field,
      or the delete choice.
-   API:
    - PATCH, DELETE, and restore accept an optional sync context
      (`resolution` and `baseVersion`);
    - the context is stored in a new nullable `audit_event.context`
      column and returned by the audit history;
    - the audit screen shows it.

## Non-scope

Conflicts on entities other than transactions.

## Acceptance

-   An offline edit to a field different from a concurrent online edit
    merges automatically, and the audit shows "mesclado automaticamente".
-   Same-field changes, edit versus delete, and delete versus edit are
    never applied without the user's choice, and every choice is
    audited.

## Definition of Done

Migration, OpenAPI, domain tests, API tests, journeys with two browser
contexts, docs, changelog.
