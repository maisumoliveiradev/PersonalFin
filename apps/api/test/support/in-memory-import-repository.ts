import type {
  ImportBatch,
  ImportRepository,
  ImportRow,
  ImportRowFilter,
} from '../../src/modules/imports/import-model.ts';
import type { FinancialTransaction } from '../../src/modules/transactions/transaction.ts';

function matches(row: ImportRow, kind: ImportRowFilter['kind']): boolean {
  if (kind === 'invalid') {
    return row.parsed === null;
  }
  if (kind === 'duplicates') {
    return row.duplicateOf !== null;
  }
  if (kind === 'importable') {
    return row.parsed !== null && (row.duplicateOf === null || row.decision === 'import');
  }
  return true;
}

export function createInMemoryImportRepository(
  transactions: () => readonly FinancialTransaction[],
): ImportRepository & { batches: ImportBatch[] } {
  const batches: ImportBatch[] = [];
  const rows = new Map<string, ImportRow[]>();
  const rowsOf = (batchId: string) => rows.get(batchId) ?? [];
  const replace = (batchId: string, change: (batch: ImportBatch) => ImportBatch) => {
    const index = batches.findIndex((batch) => batch.id === batchId);
    const current = batches[index];
    if (current === undefined) {
      return null;
    }
    const updated = change(current);
    batches[index] = updated;
    return updated;
  };
  return {
    batches,
    async create(batch) {
      const created: ImportBatch = {
        id: batch.id,
        financialSpaceId: batch.financialSpaceId,
        createdByUserId: batch.createdByUserId,
        fileName: batch.fileName,
        fileFormat: batch.fileFormat,
        rowCount: batch.rows.length,
        mapping: null,
        status: 'draft',
        importedCount: 0,
        createdAt: new Date(Date.UTC(2026, 0, 1, 12, 0, batches.length)),
        confirmedAt: null,
        undoneAt: null,
        version: 1,
      };
      batches.push(created);
      rows.set(
        batch.id,
        batch.rows.map((cells, index) => ({
          rowNumber: index + 1,
          cells,
          parsed: null,
          errors: [],
          duplicateOf: null,
          decision: null,
          transactionId: null,
        })),
      );
      return created;
    },
    async list(financialSpaceId) {
      return batches
        .filter(
          (batch) => batch.financialSpaceId === financialSpaceId && batch.status !== 'discarded',
        )
        .reverse();
    },
    async find(financialSpaceId, batchId) {
      return (
        batches.find(
          (batch) => batch.id === batchId && batch.financialSpaceId === financialSpaceId,
        ) ?? null
      );
    },
    async listAllRows(batchId) {
      return rowsOf(batchId);
    },
    async listRows(batchId, filter) {
      return rowsOf(batchId)
        .filter((row) => matches(row, filter.kind))
        .slice(filter.offset, filter.offset + filter.limit);
    },
    async counts(batchId) {
      const all = rowsOf(batchId);
      return {
        total: all.length,
        valid: all.filter((row) => row.parsed !== null).length,
        invalid: all.filter((row) => row.parsed === null).length,
        duplicates: all.filter((row) => row.duplicateOf !== null).length,
        undecidedDuplicates: all.filter((row) => row.duplicateOf !== null && row.decision === null)
          .length,
        toImport: all.filter((row) => matches(row, 'importable')).length,
      };
    },
    async saveEvaluation(batchId, mapping, evaluated) {
      replace(batchId, (batch) => ({ ...batch, mapping }));
      const byNumber = new Map(evaluated.map((row) => [row.rowNumber, row]));
      rows.set(
        batchId,
        rowsOf(batchId).map((row) => {
          const next = byNumber.get(row.rowNumber);
          return next === undefined ? row : { ...row, ...next, decision: null };
        }),
      );
    },
    async saveDecisions(batchId, decisions) {
      const byNumber = new Map(decisions.map((item) => [item.rowNumber, item.decision]));
      rows.set(
        batchId,
        rowsOf(batchId).map((row) =>
          row.duplicateOf !== null && byNumber.has(row.rowNumber)
            ? { ...row, decision: byNumber.get(row.rowNumber) ?? null }
            : row,
        ),
      );
    },
    async saveImported(batchId, imported) {
      const byNumber = new Map(imported.map((item) => [item.rowNumber, item.transactionId]));
      rows.set(
        batchId,
        rowsOf(batchId).map((row) =>
          byNumber.has(row.rowNumber)
            ? { ...row, transactionId: byNumber.get(row.rowNumber) ?? null }
            : row,
        ),
      );
    },
    async updateStatus(batchId, expectedVersion, change) {
      const current = batches.find((batch) => batch.id === batchId);
      if (current?.version !== expectedVersion) {
        return null;
      }
      return replace(batchId, (batch) => ({
        ...batch,
        status: change.status,
        importedCount: change.importedCount ?? batch.importedCount,
        confirmedAt: change.status === 'imported' ? new Date() : batch.confirmedAt,
        undoneAt: change.status === 'undone' ? new Date() : batch.undoneAt,
        version: batch.version + 1,
      }));
    },
    async bumpVersion(batchId, expectedVersion) {
      const current = batches.find((batch) => batch.id === batchId);
      if (current?.version !== expectedVersion) {
        return null;
      }
      return replace(batchId, (batch) => ({ ...batch, version: batch.version + 1 }));
    },
    async existingOnDates(financialSpaceId, dates) {
      return transactions()
        .filter(
          (transaction) =>
            transaction.financialSpaceId === financialSpaceId &&
            transaction.deletedAt === null &&
            dates.includes(transaction.financialDate),
        )
        .map((transaction) => ({
          id: transaction.id,
          type: transaction.type,
          amountMinor: transaction.amountMinor,
          financialDate: transaction.financialDate,
          description: transaction.description,
        }));
    },
  };
}
