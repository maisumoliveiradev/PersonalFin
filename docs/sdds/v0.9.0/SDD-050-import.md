# SDD-050 --- CSV/Excel Import with Review

## Objective

Import transactions from CSV or Excel through Read → Validate → Preview
→ Resolve → Confirm → Import, with duplicate review and undo (FR-083,
FR-084, FR-086, DR-058 to DR-060, DR-096).

## Scope

-   Domain: import date and amount parsing without rounding, text
    normalization, type and status words.
-   Database:
    - `import_batch` (original file, SHA-256, mapping, status, version);
    - `import_row` (cells, parsed values, errors, duplicate, decision,
      created transaction);
    - `financial_transaction.import_batch_id`.
-   API (`record` to change, `view` to read):
    - create a draft from a file;
    - map and validate;
    - list rows by filter;
    - decide duplicates;
    - confirm, undo, or discard.
-   Client:
    - "Importar planilha" with file selection on Web and native;
    - a mapping form with suggestions from the header;
    - a preview with errors and duplicates;
    - confirmation and undo, and an import history.

## Acceptance

-   Invalid or ambiguous rows are never imported.
-   Duplicates cannot be imported without a decision.
-   Undo moves every imported transaction to the trash.
-   Everything is audited.

## Definition of Done

Migration, OpenAPI, domain, API, and integration tests, journey, docs.
