import type {
  ImportDetail,
  ImportList,
  ImportRowPage,
  ImportSummary,
} from '@personalfin/api-contract';
import {
  IMPORT_DATE_FORMATS,
  IMPORT_DECIMAL_SEPARATORS,
  TRANSACTION_STATUSES,
} from '@personalfin/domain';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { ValidationError } from '../../http/errors.ts';
import { isUuid, parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import { IMPORT_FORMATS, MAX_IMPORT_BYTES, MAX_IMPORT_ROWS } from './import-file.ts';
import {
  applyMapping,
  confirmImport,
  createImport,
  decideDuplicates,
  discardImport,
  undoImport,
} from './import-management.ts';
import {
  AMOUNT_SIGNS,
  type ImportBatch,
  ImportNotFoundError,
  type ImportRow,
} from './import-model.ts';

const MAX_COLUMNS = 100;
const SAMPLE_ROWS = 5;
const BODY_LIMIT = Math.ceil((MAX_IMPORT_BYTES * 4) / 3) + 64 * 1024;

const spaceParamsSchema = z.object({ spaceId: z.string() });
const importParamsSchema = z.object({ spaceId: z.string(), importId: z.string() });
const versionSchema = z.strictObject({ version: z.number().int().min(1) });
const columnSchema = z
  .number()
  .int()
  .min(0)
  .max(MAX_COLUMNS - 1);

const createSchema = z.strictObject({
  fileName: z.string().trim().min(1).max(200),
  format: z.enum(IMPORT_FORMATS),
  contentBase64: z.string().min(1),
});

const mappingSchema = z.strictObject({
  version: z.number().int().min(1),
  mapping: z.strictObject({
    hasHeader: z.boolean(),
    columns: z.strictObject({
      date: columnSchema,
      description: columnSchema,
      amount: columnSchema,
      type: columnSchema.nullable(),
      category: columnSchema.nullable(),
      subcategory: columnSchema.nullable(),
      status: columnSchema.nullable(),
    }),
    dateFormat: z.enum(IMPORT_DATE_FORMATS),
    decimalSeparator: z.enum(IMPORT_DECIMAL_SEPARATORS),
    amountSign: z.enum(AMOUNT_SIGNS),
    fallbackCategoryIds: z.strictObject({
      expense: z.uuid().nullable(),
      income: z.uuid().nullable(),
    }),
    defaultStatus: z.enum(TRANSACTION_STATUSES),
  }),
});

const decisionsSchema = z.union([
  z.strictObject({
    version: z.number().int().min(1),
    decisions: z
      .array(
        z.strictObject({
          rowNumber: z.number().int().min(1),
          decision: z.enum(['import', 'skip']),
        }),
      )
      .min(1)
      .max(MAX_IMPORT_ROWS),
  }),
  z.strictObject({
    version: z.number().int().min(1),
    all: z.enum(['import', 'skip']),
  }),
]);

const rowsQuerySchema = z.object({
  filter: z.enum(['all', 'invalid', 'duplicates', 'importable']).default('all'),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

function toSummary(batch: ImportBatch): ImportSummary {
  return {
    id: batch.id,
    fileName: batch.fileName,
    format: batch.fileFormat,
    status: batch.status,
    rowCount: batch.rowCount,
    importedCount: batch.importedCount,
    createdAt: batch.createdAt.toISOString(),
    confirmedAt: batch.confirmedAt?.toISOString() ?? null,
    undoneAt: batch.undoneAt?.toISOString() ?? null,
    version: batch.version,
  };
}

function toRowResponse(row: ImportRow) {
  return {
    rowNumber: row.rowNumber,
    cells: row.cells,
    parsed: row.parsed,
    errors: row.errors,
    duplicateOf: row.duplicateOf,
    decision: row.decision,
    transactionId: row.transactionId,
  };
}

export function registerImportRoutes(server: FastifyInstance, data: DataAccess): void {
  async function access(request: FastifyRequest, permission: 'view' | 'record') {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      spaceId,
      permission,
    );
    return { userId: user.id, spaceId: space.id };
  }

  function importIdOf(request: FastifyRequest): string {
    const { importId } = parseInput(importParamsSchema, request.params);
    if (!isUuid(importId)) {
      throw new ImportNotFoundError();
    }
    return importId;
  }

  async function detail(batch: ImportBatch): Promise<ImportDetail> {
    const [counts, firstRows] = await Promise.all([
      data.repositories.imports.counts(batch.id),
      data.repositories.imports.listRows(batch.id, { kind: 'all', offset: 0, limit: SAMPLE_ROWS }),
    ]);
    return {
      ...toSummary(batch),
      mapping: batch.mapping,
      counts: batch.mapping === null ? null : counts,
      firstRows: firstRows.map((row) => row.cells),
    };
  }

  server.post(
    '/financial-spaces/:spaceId/imports',
    { bodyLimit: BODY_LIMIT },
    async (request, reply): Promise<ImportDetail> => {
      const { userId, spaceId } = await access(request, 'record');
      const input = parseInput(createSchema, request.body);
      const content = Buffer.from(input.contentBase64, 'base64');
      if (content.length === 0) {
        throw new ValidationError('contentBase64: must be base64 file content');
      }
      if (content.length > MAX_IMPORT_BYTES) {
        throw new ValidationError(
          `contentBase64: the file must have at most ${MAX_IMPORT_BYTES} bytes`,
        );
      }
      const batch = await createImport(data, {
        financialSpaceId: spaceId,
        actorUserId: userId,
        fileName: input.fileName,
        format: input.format,
        content,
      });
      reply.status(201);
      return detail(batch);
    },
  );

  server.get('/financial-spaces/:spaceId/imports', async (request): Promise<ImportList> => {
    const { spaceId } = await access(request, 'view');
    return { items: (await data.repositories.imports.list(spaceId)).map(toSummary) };
  });

  server.get(
    '/financial-spaces/:spaceId/imports/:importId',
    async (request): Promise<ImportDetail> => {
      const { spaceId } = await access(request, 'view');
      const batch = await data.repositories.imports.find(spaceId, importIdOf(request));
      if (batch === null) {
        throw new ImportNotFoundError();
      }
      return detail(batch);
    },
  );

  server.get(
    '/financial-spaces/:spaceId/imports/:importId/rows',
    async (request): Promise<ImportRowPage> => {
      const { spaceId } = await access(request, 'view');
      const batch = await data.repositories.imports.find(spaceId, importIdOf(request));
      if (batch === null) {
        throw new ImportNotFoundError();
      }
      const query = parseInput(rowsQuerySchema, request.query);
      const rows = await data.repositories.imports.listRows(batch.id, {
        kind: query.filter,
        offset: query.offset,
        limit: query.limit + 1,
      });
      return {
        items: rows.slice(0, query.limit).map(toRowResponse),
        hasMore: rows.length > query.limit,
      };
    },
  );

  server.put(
    '/financial-spaces/:spaceId/imports/:importId/mapping',
    async (request): Promise<ImportDetail> => {
      const { spaceId } = await access(request, 'record');
      const { version, mapping } = parseInput(mappingSchema, request.body);
      const batch = await applyMapping(data, {
        financialSpaceId: spaceId,
        batchId: importIdOf(request),
        expectedVersion: version,
        mapping,
      });
      return detail(batch);
    },
  );

  server.put(
    '/financial-spaces/:spaceId/imports/:importId/decisions',
    async (request): Promise<ImportDetail> => {
      const { spaceId } = await access(request, 'record');
      const input = parseInput(decisionsSchema, request.body);
      const batchId = importIdOf(request);
      let decisions: { rowNumber: number; decision: 'import' | 'skip' }[];
      if ('all' in input) {
        const duplicates = await data.repositories.imports.listRows(batchId, {
          kind: 'duplicates',
          offset: 0,
          limit: MAX_IMPORT_ROWS,
        });
        decisions = duplicates.map((row) => ({ rowNumber: row.rowNumber, decision: input.all }));
      } else {
        decisions = input.decisions;
      }
      const batch = await decideDuplicates(data, {
        financialSpaceId: spaceId,
        batchId,
        expectedVersion: input.version,
        decisions,
      });
      return detail(batch);
    },
  );

  for (const [action, operation] of [
    ['confirm', confirmImport],
    ['undo', undoImport],
  ] as const) {
    server.post(
      `/financial-spaces/:spaceId/imports/:importId/${action}`,
      async (request): Promise<ImportDetail> => {
        const { userId, spaceId } = await access(request, 'record');
        const { version } = parseInput(versionSchema, request.body);
        const batch = await operation(data, {
          financialSpaceId: spaceId,
          batchId: importIdOf(request),
          actorUserId: userId,
          expectedVersion: version,
        });
        return detail(batch);
      },
    );
  }

  server.post(
    '/financial-spaces/:spaceId/imports/:importId/discard',
    async (request): Promise<ImportDetail> => {
      const { spaceId } = await access(request, 'record');
      const { version } = parseInput(versionSchema, request.body);
      const batch = await discardImport(data, {
        financialSpaceId: spaceId,
        batchId: importIdOf(request),
        expectedVersion: version,
      });
      return detail(batch);
    },
  );
}
