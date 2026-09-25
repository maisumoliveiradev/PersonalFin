# v0.9.0 --- Import, Export, and Data Portability

Drafted by the AI agent on 2026-09-25 under the project owner's
delegation. Sources: `ROADMAP.md` (v0.9.0), FR-083 to FR-089, DR-058 to
DR-061, and `PRODUCT-VISION.md` sections 23 to 25. Decisions the
documents left open are listed here for owner review.

## Sequence

1.  `SDD-050-import.md`
2.  `SDD-051-exports.md`
3.  `SDD-052-pdf-report.md`
4.  `SDD-053-portable-backup.md`
5.  `SDD-054-release-validation.md`

## Decisions for owner review

-   **Import flow (DR-096):**
    - Read: a CSV or XLSX file of at most 5 MB and 5,000 rows is stored
      with its SHA-256 for traceability.
    - Validate: the user maps columns explicitly.
    - Preview: every row shows its parsed values or errors.
    - Resolve: every suspected duplicate needs an import or skip
      decision.
    - Confirm: the transactions are created with a link to the import.
    - Undo: every transaction of the import moves to the trash, audited.
-   **Nothing ambiguous is guessed (DR-058):**
    - Date order and decimal separator are chosen; ISO dates are always
      accepted.
    - Excel numbers are read as text and never rounded. More than two
      decimals is an error.
    - The sign convention is chosen:
      - negative means expense;
      - a type column;
      - all expenses;
      - all income.

      A negative amount under any other convention is an error.
    - Unknown type or status words are errors.
    - Categories match by name, ignoring case and accents, including a
      unique subcategory name. Otherwise the row uses a fallback category
      the user chose (marked as such), or is an error.
-   **Duplicates (DR-060):** a row is a suspected duplicate when it has
    the same type, date, and amount as an existing active transaction or
    an earlier row of the file. Descriptions are shown, not compared,
    because bank descriptions vary.
-   **Spreadsheet migration (FR-086):** the importer is the migration
    tool. The original file stays stored with the batch. A dedicated
    template can be added once the owner shares a sample of the current
    spreadsheet.
-   **Exports (DR-097):**
    - CSV (UTF-8 with BOM, `;`, decimal comma, for Excel pt-BR) and XLSX
      of the transactions that match the list filters;
    - a monthly PDF report with the month's metrics and transactions;
    - they are reports, not backups.
-   **Portable backup (DR-097):**
    - a versioned JSON document with every record the user can access in
      every space, including deleted transactions, plus their global
      goals;
    - restore is a later roadmap item.

## Out of scope for v0.9.0

- OFX import.
- Scheduled or automatic exports.
- Backup restore.
- Importing into entities other than transactions.
