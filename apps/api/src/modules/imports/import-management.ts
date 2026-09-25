import { createHash, randomUUID } from 'node:crypto';

import { DEFAULT_CURRENCY } from '@personalfin/domain';

import type { DataAccess, Repositories } from '../../database/data-access.ts';
import { VersionConflictError } from '../transactions/update-transaction.ts';
import {
  type ImportFormat,
  MAX_IMPORT_ROWS,
  readImportFile,
  UnreadableImportFileError,
} from './import-file.ts';
import { buildCategoryIndexes, evaluateRow, markDuplicates } from './import-mapping.ts';
import {
  type ImportBatch,
  type ImportDecision,
  ImportFileError,
  type ImportMapping,
  ImportNotFoundError,
  ImportStateError,
} from './import-model.ts';

async function requireBatch(
  repositories: Repositories,
  financialSpaceId: string,
  batchId: string,
  expectedVersion?: number,
): Promise<ImportBatch> {
  const batch = await repositories.imports.find(financialSpaceId, batchId, { lock: true });
  if (batch === null) {
    throw new ImportNotFoundError();
  }
  if (expectedVersion !== undefined && batch.version !== expectedVersion) {
    throw new VersionConflictError();
  }
  return batch;
}

function requireDraft(batch: ImportBatch): void {
  if (batch.status !== 'draft') {
    throw new ImportStateError('IMPORT_NOT_DRAFT', 'Only draft imports can be changed');
  }
}

export async function createImport(
  data: DataAccess,
  input: {
    financialSpaceId: string;
    actorUserId: string;
    fileName: string;
    format: ImportFormat;
    content: Uint8Array;
  },
): Promise<ImportBatch> {
  let rows: string[][];
  try {
    ({ rows } = await readImportFile(input.format, input.content));
  } catch (error) {
    if (error instanceof UnreadableImportFileError) {
      throw new ImportFileError('IMPORT_FILE_UNREADABLE', 'The file could not be read');
    }
    throw error;
  }
  if (rows.length === 0) {
    throw new ImportFileError('IMPORT_FILE_EMPTY', 'The file has no rows');
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new ImportFileError('IMPORT_TOO_MANY_ROWS', `Import at most ${MAX_IMPORT_ROWS} rows`);
  }
  return data.transaction((repositories) =>
    repositories.imports.create({
      id: randomUUID(),
      financialSpaceId: input.financialSpaceId,
      createdByUserId: input.actorUserId,
      fileName: input.fileName,
      fileFormat: input.format,
      fileSha256: createHash('sha256').update(input.content).digest('hex'),
      fileContent: input.content,
      rows,
    }),
  );
}

export async function applyMapping(
  data: DataAccess,
  input: {
    financialSpaceId: string;
    batchId: string;
    expectedVersion: number;
    mapping: ImportMapping;
  },
): Promise<ImportBatch> {
  return data.transaction(async (repositories) => {
    const batch = await requireBatch(
      repositories,
      input.financialSpaceId,
      input.batchId,
      input.expectedVersion,
    );
    requireDraft(batch);
    const [rows, categories] = await Promise.all([
      repositories.imports.listAllRows(batch.id),
      repositories.categories.listForSpace(input.financialSpaceId),
    ]);
    const indexes = buildCategoryIndexes(categories);
    const dataRows = input.mapping.hasHeader ? rows.slice(1) : rows;
    const evaluated = dataRows.map((row) =>
      evaluateRow(row.rowNumber, row.cells, input.mapping, indexes),
    );
    const dates = [
      ...new Set(
        evaluated.flatMap((row) => (row.parsed === null ? [] : [row.parsed.financialDate])),
      ),
    ];
    const existing = await repositories.imports.existingOnDates(input.financialSpaceId, dates);
    const withDuplicates = markDuplicates(evaluated, existing);
    const header = input.mapping.hasHeader ? rows[0] : undefined;
    await repositories.imports.saveEvaluation(batch.id, input.mapping, [
      ...(header === undefined
        ? []
        : [{ rowNumber: header.rowNumber, parsed: null, errors: ['header'], duplicateOf: null }]),
      ...withDuplicates,
    ]);
    const updated = await repositories.imports.bumpVersion(batch.id, batch.version);
    if (updated === null) {
      throw new VersionConflictError();
    }
    return updated;
  });
}

export async function decideDuplicates(
  data: DataAccess,
  input: {
    financialSpaceId: string;
    batchId: string;
    expectedVersion: number;
    decisions: { rowNumber: number; decision: ImportDecision }[];
  },
): Promise<ImportBatch> {
  return data.transaction(async (repositories) => {
    const batch = await requireBatch(
      repositories,
      input.financialSpaceId,
      input.batchId,
      input.expectedVersion,
    );
    requireDraft(batch);
    await repositories.imports.saveDecisions(batch.id, input.decisions);
    const updated = await repositories.imports.bumpVersion(batch.id, batch.version);
    if (updated === null) {
      throw new VersionConflictError();
    }
    return updated;
  });
}

export async function confirmImport(
  data: DataAccess,
  input: {
    financialSpaceId: string;
    batchId: string;
    actorUserId: string;
    expectedVersion: number;
  },
): Promise<ImportBatch> {
  return data.transaction(async (repositories) => {
    const batch = await requireBatch(
      repositories,
      input.financialSpaceId,
      input.batchId,
      input.expectedVersion,
    );
    requireDraft(batch);
    if (batch.mapping === null) {
      throw new ImportStateError('IMPORT_NOT_MAPPED', 'Map the columns before confirming');
    }
    const counts = await repositories.imports.counts(batch.id);
    if (counts.undecidedDuplicates > 0) {
      throw new ImportStateError(
        'IMPORT_DUPLICATES_UNDECIDED',
        'Decide every suspected duplicate before confirming',
      );
    }
    if (counts.toImport === 0) {
      throw new ImportStateError('IMPORT_NOTHING_TO_IMPORT', 'There are no rows to import');
    }
    const categories = await repositories.categories.listForSpace(input.financialSpaceId);
    const usable = new Map(
      categories
        .filter((category) => category.archivedAt === null)
        .map((category) => [category.id, category]),
    );
    const rows = await repositories.imports.listRows(batch.id, {
      kind: 'importable',
      offset: 0,
      limit: MAX_IMPORT_ROWS,
    });
    const imported: { rowNumber: number; transactionId: string }[] = [];
    for (const row of rows) {
      const parsed = row.parsed;
      if (parsed === null) {
        continue;
      }
      const category = usable.get(parsed.categoryId);
      const subcategory = parsed.subcategoryId === null ? null : usable.get(parsed.subcategoryId);
      if (category === undefined || subcategory === undefined) {
        throw new ImportStateError(
          'IMPORT_CATEGORY_CHANGED',
          'A mapped category was archived or removed; map the columns again',
        );
      }
      const transaction = await repositories.transactions.create({
        id: randomUUID(),
        financialSpaceId: input.financialSpaceId,
        type: parsed.type,
        status: parsed.status,
        description: parsed.description,
        amountMinor: parsed.amountMinor,
        currency: DEFAULT_CURRENCY,
        financialDate: parsed.financialDate,
        categoryId: parsed.categoryId,
        subcategoryId: parsed.subcategoryId,
        createdByUserId: input.actorUserId,
        importBatchId: batch.id,
      });
      imported.push({ rowNumber: row.rowNumber, transactionId: transaction.id });
    }
    await repositories.imports.saveImported(batch.id, imported);
    const updated = await repositories.imports.updateStatus(batch.id, batch.version, {
      status: 'imported',
      importedCount: imported.length,
    });
    if (updated === null) {
      throw new VersionConflictError();
    }
    await repositories.audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'import_batch',
      entityId: batch.id,
      action: 'create',
      actorUserId: input.actorUserId,
      changes: {
        fileName: { before: null, after: batch.fileName },
        importedCount: { before: null, after: imported.length },
        skippedDuplicates: {
          before: null,
          after: counts.valid - counts.toImport,
        },
        invalidRows: { before: null, after: counts.invalid - (batch.mapping.hasHeader ? 1 : 0) },
      },
    });
    return updated;
  });
}

export async function undoImport(
  data: DataAccess,
  input: {
    financialSpaceId: string;
    batchId: string;
    actorUserId: string;
    expectedVersion: number;
  },
): Promise<ImportBatch> {
  return data.transaction(async (repositories) => {
    const batch = await requireBatch(
      repositories,
      input.financialSpaceId,
      input.batchId,
      input.expectedVersion,
    );
    if (batch.status !== 'imported') {
      throw new ImportStateError('IMPORT_NOT_IMPORTED', 'Only confirmed imports can be undone');
    }
    const rows = await repositories.imports.listAllRows(batch.id);
    let removed = 0;
    for (const row of rows) {
      if (row.transactionId === null) {
        continue;
      }
      const current = await repositories.transactions.findInSpace(
        input.financialSpaceId,
        row.transactionId,
        { lock: true },
      );
      if (current === null || current.deletedAt !== null) {
        continue;
      }
      const deleted = await repositories.transactions.setDeleted({
        financialSpaceId: input.financialSpaceId,
        transactionId: current.id,
        expectedVersion: current.version,
        deleted: true,
        actorUserId: input.actorUserId,
      });
      if (deleted === null) {
        throw new VersionConflictError();
      }
      await repositories.audit.record({
        financialSpaceId: input.financialSpaceId,
        entityType: 'financial_transaction',
        entityId: current.id,
        action: 'delete',
        actorUserId: input.actorUserId,
        changes: {
          deletedAt: { before: null, after: deleted.deletedAt?.toISOString() ?? null },
        },
      });
      removed += 1;
    }
    const updated = await repositories.imports.updateStatus(batch.id, batch.version, {
      status: 'undone',
    });
    if (updated === null) {
      throw new VersionConflictError();
    }
    await repositories.audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'import_batch',
      entityId: batch.id,
      action: 'delete',
      actorUserId: input.actorUserId,
      changes: { removedTransactions: { before: null, after: removed } },
    });
    return updated;
  });
}

export async function discardImport(
  data: DataAccess,
  input: { financialSpaceId: string; batchId: string; expectedVersion: number },
): Promise<ImportBatch> {
  return data.transaction(async (repositories) => {
    const batch = await requireBatch(
      repositories,
      input.financialSpaceId,
      input.batchId,
      input.expectedVersion,
    );
    requireDraft(batch);
    const updated = await repositories.imports.updateStatus(batch.id, batch.version, {
      status: 'discarded',
    });
    if (updated === null) {
      throw new VersionConflictError();
    }
    return updated;
  });
}
