# v0.11.0 --- Documents and OCR

Drafted by the AI agent on 2026-09-25 under the project owner's
delegation. Sources: `ROADMAP.md` (v0.11.0), FR-074 to FR-078, DR-069 to
DR-071, and `PRODUCT-VISION.md` sections 20 and 21. Decisions for owner
review are listed here.

## Sequence

1.  `SDD-057-attachments.md`
2.  `SDD-058-release-validation.md`

## Decisions for owner review

-   **Attachments (DR-099):**
    - JPEG, PNG, WebP, HEIC images and PDF documents of up to 5 MB, at
      most 10 per transaction.
    - The type is detected from the file bytes, never from the name.
    - Added from files (Web and native) or the camera (native).
    - Stored in PostgreSQL with a SHA-256 hash.
    - Served only to members with `view`, with `nosniff` and no caching.
    - Removal is a soft delete. Adding and removing are audited.
    - The portable backup lists attachment metadata but not the bytes.
-   **OCR/AI extraction --- pending owner decision:** reading amount,
    date, and establishment from a receipt (FR-075 to FR-077) needs an
    external OCR or AI service. That means credentials, costs, and
    sending receipt images to a third party, and the owner has not
    chosen one. Attachments are the capture step that extraction will
    reuse. Once chosen, extracted fields must go through a review form
    before saving (DR-070), and never assign subjective categories
    (DR-071).
-   **Storage:** keeping files in the database keeps backups, access
    checks, and the local setup simple. At larger scale, object storage
    with the same API is the planned evolution (TD-014).

## Out of scope for v0.11.0

- OCR/AI extraction and its review flow (pending owner decision).
- Image editing and compression.
- Attachments on entities other than transactions.
