import type { FinancialDate, TransactionType } from '@personalfin/domain';

import type { Queryable } from '../../database/pool.ts';
import type { ImportFormat } from './import-file.ts';
import type {
  DuplicateOf,
  ImportBatch,
  ImportDecision,
  ImportMapping,
  ImportRepository,
  ImportRow,
  ImportStatus,
  ParsedImportRow,
} from './import-model.ts';

interface BatchRow {
  id: string;
  financial_space_id: string;
  created_by_user_id: string;
  file_name: string;
  file_format: ImportFormat;
  row_count: number;
  mapping: ImportMapping | null;
  status: ImportStatus;
  imported_count: number;
  created_at: Date;
  confirmed_at: Date | null;
  undone_at: Date | null;
  version: number;
}

interface RowRow {
  row_number: number;
  cells: string[];
  parsed: ParsedImportRow | null;
  errors: string[];
  duplicate_of: DuplicateOf | null;
  decision: ImportDecision | null;
  transaction_id: string | null;
}

const BATCH_COLUMNS = `id, financial_space_id, created_by_user_id, file_name, file_format, row_count,
  mapping, status, imported_count, created_at, confirmed_at, undone_at, version`;

const ROW_COLUMNS = 'row_number, cells, parsed, errors, duplicate_of, decision, transaction_id';

const ROW_FILTERS = {
  all: 'TRUE',
  invalid: 'parsed IS NULL',
  duplicates: 'duplicate_of IS NOT NULL',
  importable: "parsed IS NOT NULL AND (duplicate_of IS NULL OR decision = 'import')",
} as const;

function toBatch(row: BatchRow): ImportBatch {
  return {
    id: row.id,
    financialSpaceId: row.financial_space_id,
    createdByUserId: row.created_by_user_id,
    fileName: row.file_name,
    fileFormat: row.file_format,
    rowCount: row.row_count,
    mapping: row.mapping,
    status: row.status,
    importedCount: row.imported_count,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
    undoneAt: row.undone_at,
    version: row.version,
  };
}

function toRow(row: RowRow): ImportRow {
  return {
    rowNumber: row.row_number,
    cells: row.cells,
    parsed: row.parsed,
    errors: row.errors,
    duplicateOf: row.duplicate_of,
    decision: row.decision,
    transactionId: row.transaction_id,
  };
}

export function createPostgresImportRepository(db: Queryable): ImportRepository {
  return {
    async create(batch) {
      const { rows } = await db.query<BatchRow>(
        `INSERT INTO import_batch (id, financial_space_id, created_by_user_id, file_name,
           file_format, file_sha256, file_content, row_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING ${BATCH_COLUMNS}`,
        [
          batch.id,
          batch.financialSpaceId,
          batch.createdByUserId,
          batch.fileName,
          batch.fileFormat,
          batch.fileSha256,
          Buffer.from(batch.fileContent),
          batch.rows.length,
        ],
      );
      await db.query(
        `INSERT INTO import_row (import_batch_id, row_number, cells)
         SELECT $1, ordinality, value FROM jsonb_array_elements($2::jsonb) WITH ORDINALITY`,
        [batch.id, JSON.stringify(batch.rows)],
      );
      const [row] = rows;
      if (row === undefined) {
        throw new Error('Import insert returned no row');
      }
      return toBatch(row);
    },

    async list(financialSpaceId) {
      const { rows } = await db.query<BatchRow>(
        `SELECT ${BATCH_COLUMNS} FROM import_batch
         WHERE financial_space_id = $1 AND status <> 'discarded'
         ORDER BY created_at DESC, id`,
        [financialSpaceId],
      );
      return rows.map(toBatch);
    },

    async find(financialSpaceId, batchId, options) {
      const { rows } = await db.query<BatchRow>(
        `SELECT ${BATCH_COLUMNS} FROM import_batch
         WHERE financial_space_id = $1 AND id = $2 ${options?.lock ? 'FOR UPDATE' : ''}`,
        [financialSpaceId, batchId],
      );
      const [row] = rows;
      return row === undefined ? null : toBatch(row);
    },

    async listAllRows(batchId) {
      const { rows } = await db.query<RowRow>(
        `SELECT ${ROW_COLUMNS} FROM import_row WHERE import_batch_id = $1 ORDER BY row_number`,
        [batchId],
      );
      return rows.map(toRow);
    },

    async listRows(batchId, filter) {
      const { rows } = await db.query<RowRow>(
        `SELECT ${ROW_COLUMNS} FROM import_row
         WHERE import_batch_id = $1 AND ${ROW_FILTERS[filter.kind]}
         ORDER BY row_number OFFSET $2 LIMIT $3`,
        [batchId, filter.offset, filter.limit],
      );
      return rows.map(toRow);
    },

    async counts(batchId) {
      const { rows } = await db.query<Record<string, string>>(
        `SELECT count(*) AS total,
           count(*) FILTER (WHERE parsed IS NOT NULL) AS valid,
           count(*) FILTER (WHERE parsed IS NULL) AS invalid,
           count(*) FILTER (WHERE duplicate_of IS NOT NULL) AS duplicates,
           count(*) FILTER (WHERE duplicate_of IS NOT NULL AND decision IS NULL) AS undecided,
           count(*) FILTER (WHERE ${ROW_FILTERS.importable}) AS to_import
         FROM import_row WHERE import_batch_id = $1`,
        [batchId],
      );
      const [row] = rows;
      return {
        total: Number(row?.total ?? 0),
        valid: Number(row?.valid ?? 0),
        invalid: Number(row?.invalid ?? 0),
        duplicates: Number(row?.duplicates ?? 0),
        undecidedDuplicates: Number(row?.undecided ?? 0),
        toImport: Number(row?.to_import ?? 0),
      };
    },

    async saveEvaluation(batchId, mapping, evaluated) {
      await db.query('UPDATE import_batch SET mapping = $2 WHERE id = $1', [
        batchId,
        JSON.stringify(mapping),
      ]);
      await db.query(
        `UPDATE import_row r SET
           parsed = v.parsed,
           errors = ARRAY(SELECT jsonb_array_elements_text(v.errors)),
           duplicate_of = v.duplicate_of,
           decision = NULL
         FROM jsonb_to_recordset($2::jsonb)
           AS v(row_number integer, parsed jsonb, errors jsonb, duplicate_of jsonb)
         WHERE r.import_batch_id = $1 AND r.row_number = v.row_number`,
        [
          batchId,
          JSON.stringify(
            evaluated.map((row) => ({
              row_number: row.rowNumber,
              parsed: row.parsed,
              errors: row.errors,
              duplicate_of: row.duplicateOf,
            })),
          ),
        ],
      );
    },

    async saveDecisions(batchId, decisions) {
      await db.query(
        `UPDATE import_row r SET decision = v.decision
         FROM jsonb_to_recordset($2::jsonb) AS v(row_number integer, decision text)
         WHERE r.import_batch_id = $1 AND r.row_number = v.row_number
           AND r.duplicate_of IS NOT NULL`,
        [
          batchId,
          JSON.stringify(
            decisions.map((item) => ({ row_number: item.rowNumber, decision: item.decision })),
          ),
        ],
      );
    },

    async saveImported(batchId, imported) {
      await db.query(
        `UPDATE import_row r SET transaction_id = v.transaction_id
         FROM jsonb_to_recordset($2::jsonb) AS v(row_number integer, transaction_id uuid)
         WHERE r.import_batch_id = $1 AND r.row_number = v.row_number`,
        [
          batchId,
          JSON.stringify(
            imported.map((item) => ({
              row_number: item.rowNumber,
              transaction_id: item.transactionId,
            })),
          ),
        ],
      );
    },

    async updateStatus(batchId, expectedVersion, change) {
      const { rows } = await db.query<BatchRow>(
        `UPDATE import_batch SET status = $3,
           imported_count = COALESCE($4, imported_count),
           confirmed_at = CASE WHEN $3 = 'imported' THEN now() ELSE confirmed_at END,
           undone_at = CASE WHEN $3 = 'undone' THEN now() ELSE undone_at END,
           version = version + 1
         WHERE id = $1 AND version = $2
         RETURNING ${BATCH_COLUMNS}`,
        [batchId, expectedVersion, change.status, change.importedCount ?? null],
      );
      const [row] = rows;
      return row === undefined ? null : toBatch(row);
    },

    async bumpVersion(batchId, expectedVersion) {
      const { rows } = await db.query<BatchRow>(
        `UPDATE import_batch SET version = version + 1 WHERE id = $1 AND version = $2
         RETURNING ${BATCH_COLUMNS}`,
        [batchId, expectedVersion],
      );
      const [row] = rows;
      return row === undefined ? null : toBatch(row);
    },

    async existingOnDates(financialSpaceId, dates) {
      if (dates.length === 0) {
        return [];
      }
      const { rows } = await db.query<{
        id: string;
        type: TransactionType;
        amount_minor: string;
        financial_date: FinancialDate;
        description: string;
      }>(
        `SELECT id, type, amount_minor, to_char(financial_date, 'YYYY-MM-DD') AS financial_date,
           description
         FROM financial_transaction
         WHERE financial_space_id = $1 AND deleted_at IS NULL
           AND financial_date = ANY($2::date[])
         ORDER BY created_at, id`,
        [financialSpaceId, dates],
      );
      return rows.map((row) => ({
        id: row.id,
        type: row.type,
        amountMinor: Number(row.amount_minor),
        financialDate: row.financial_date,
        description: row.description,
      }));
    },
  };
}
