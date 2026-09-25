import type {
  FinancialDate,
  ImportDateFormat,
  ImportDecimalSeparator,
  TransactionStatus,
  TransactionType,
} from '@personalfin/domain';

import { AppError, NotFoundError } from '../../http/errors.ts';
import type { ImportFormat } from './import-file.ts';

export const AMOUNT_SIGNS = [
  'type_column',
  'negative_is_expense',
  'all_expenses',
  'all_income',
] as const;
export type AmountSign = (typeof AMOUNT_SIGNS)[number];

export type ImportStatus = 'draft' | 'imported' | 'undone' | 'discarded';

export interface ImportMapping {
  hasHeader: boolean;
  columns: {
    date: number;
    description: number;
    amount: number;
    type: number | null;
    category: number | null;
    subcategory: number | null;
    status: number | null;
  };
  dateFormat: ImportDateFormat;
  decimalSeparator: ImportDecimalSeparator;
  amountSign: AmountSign;
  fallbackCategoryIds: { expense: string | null; income: string | null };
  defaultStatus: TransactionStatus;
}

export type ImportWarning = 'category_fallback' | 'subcategory_ignored';

export interface ParsedImportRow {
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  amountMinor: number;
  financialDate: FinancialDate;
  categoryId: string;
  subcategoryId: string | null;
  warnings: ImportWarning[];
}

export type DuplicateOf =
  | { kind: 'transaction'; transactionId: string; description: string }
  | { kind: 'row'; rowNumber: number };

export type ImportDecision = 'import' | 'skip';

export interface ImportRow {
  rowNumber: number;
  cells: string[];
  parsed: ParsedImportRow | null;
  errors: string[];
  duplicateOf: DuplicateOf | null;
  decision: ImportDecision | null;
  transactionId: string | null;
}

export interface ImportBatch {
  id: string;
  financialSpaceId: string;
  createdByUserId: string;
  fileName: string;
  fileFormat: ImportFormat;
  rowCount: number;
  mapping: ImportMapping | null;
  status: ImportStatus;
  importedCount: number;
  createdAt: Date;
  confirmedAt: Date | null;
  undoneAt: Date | null;
  version: number;
}

export interface ImportRowFilter {
  kind: 'all' | 'invalid' | 'duplicates' | 'importable';
  offset: number;
  limit: number;
}

export interface ImportCounts {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  undecidedDuplicates: number;
  toImport: number;
}

export interface ImportRepository {
  create(batch: {
    id: string;
    financialSpaceId: string;
    createdByUserId: string;
    fileName: string;
    fileFormat: ImportFormat;
    fileSha256: string;
    fileContent: Uint8Array;
    rows: string[][];
  }): Promise<ImportBatch>;
  list(financialSpaceId: string): Promise<ImportBatch[]>;
  find(
    financialSpaceId: string,
    batchId: string,
    options?: { lock: boolean },
  ): Promise<ImportBatch | null>;
  listAllRows(batchId: string): Promise<ImportRow[]>;
  listRows(batchId: string, filter: ImportRowFilter): Promise<ImportRow[]>;
  counts(batchId: string): Promise<ImportCounts>;
  saveEvaluation(
    batchId: string,
    mapping: ImportMapping,
    rows: readonly Pick<ImportRow, 'rowNumber' | 'parsed' | 'errors' | 'duplicateOf'>[],
  ): Promise<void>;
  saveDecisions(
    batchId: string,
    decisions: readonly { rowNumber: number; decision: ImportDecision }[],
  ): Promise<void>;
  saveImported(
    batchId: string,
    rows: readonly { rowNumber: number; transactionId: string }[],
  ): Promise<void>;
  updateStatus(
    batchId: string,
    expectedVersion: number,
    change: { status: ImportStatus; importedCount?: number },
  ): Promise<ImportBatch | null>;
  bumpVersion(batchId: string, expectedVersion: number): Promise<ImportBatch | null>;
  existingOnDates(
    financialSpaceId: string,
    dates: readonly FinancialDate[],
  ): Promise<
    {
      id: string;
      type: TransactionType;
      amountMinor: number;
      financialDate: FinancialDate;
      description: string;
    }[]
  >;
}

export class ImportNotFoundError extends NotFoundError {
  constructor() {
    super('IMPORT_NOT_FOUND', 'Import not found');
  }
}

export class ImportStateError extends AppError {
  override name = 'ImportStateError';

  constructor(code: string, message: string) {
    super(409, code, message);
  }
}

export class ImportFileError extends AppError {
  override name = 'ImportFileError';

  constructor(code: string, message: string) {
    super(422, code, message);
  }
}
