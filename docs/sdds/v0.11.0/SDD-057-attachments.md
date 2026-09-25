# SDD-057 --- Transaction Attachments

## Objective

Attach images and PDFs to transactions from files or the camera
(FR-074, the capture part of FR-075, DR-099).

## Scope

-   Database: `attachment` (bytes, SHA-256, soft delete); audit entity
    `attachment`.
-   API:
    - list, add (content type detected from the bytes, size and count
      limits), download, and remove;
    - `attachmentCount` on transactions;
    - backup metadata.
-   Client: an "Anexos" section on the transaction screen (attach file,
    take a photo on native, open, remove) and an attachment marker on
    list rows.

## Acceptance

-   Only real images and PDFs are accepted.
-   Other spaces and non-members never reach the files.
-   Changes are audited.

## Definition of Done

Migration, OpenAPI, API and integration tests, journey, docs, TD-014.
