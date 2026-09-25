import {
  classifyImportStatus,
  classifyImportType,
  normalizeForMatch,
  parseImportAmount,
  parseImportDate,
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  type TransactionType,
} from '@personalfin/domain';

import type { Category } from '../categories/category.ts';
import type { DuplicateOf, ImportMapping, ImportWarning, ParsedImportRow } from './import-model.ts';

export interface EvaluatedRow {
  rowNumber: number;
  parsed: ParsedImportRow | null;
  errors: string[];
  duplicateOf: DuplicateOf | null;
}

interface CategoryIndex {
  top: Map<string, Category>;
  sub: Map<string, Category[]>;
  byId: Map<string, Category>;
}

function indexCategories(categories: readonly Category[], kind: TransactionType): CategoryIndex {
  const usable = categories.filter(
    (category) => category.kind === kind && category.archivedAt === null,
  );
  const byId = new Map(usable.map((category) => [category.id, category]));
  const top = new Map<string, Category>();
  const sub = new Map<string, Category[]>();
  for (const category of usable) {
    const key = normalizeForMatch(category.name);
    if (category.parentCategoryId === null) {
      top.set(key, category);
    } else if (byId.has(category.parentCategoryId)) {
      sub.set(key, [...(sub.get(key) ?? []), category]);
    }
  }
  return { top, sub, byId };
}

function cell(cells: readonly string[], index: number | null): string {
  return index === null ? '' : (cells[index] ?? '').trim();
}

const AMOUNT_ERRORS: Record<string, string> = {
  empty: 'amount_empty',
  invalid: 'amount_invalid',
  too_many_decimals: 'amount_too_many_decimals',
  zero: 'amount_zero',
  too_large: 'amount_too_large',
};

export function evaluateRow(
  rowNumber: number,
  cells: readonly string[],
  mapping: ImportMapping,
  categories: Record<TransactionType, CategoryIndex>,
): EvaluatedRow {
  const errors: string[] = [];
  const warnings: ImportWarning[] = [];
  const { columns } = mapping;

  const financialDate = parseImportDate(cell(cells, columns.date), mapping.dateFormat);
  if (financialDate === null) {
    errors.push('date_invalid');
  }
  const description = cell(cells, columns.description).replace(/\s+/g, ' ');
  if (description === '') {
    errors.push('description_empty');
  } else if (description.length > TRANSACTION_DESCRIPTION_MAX_LENGTH) {
    errors.push('description_too_long');
  }
  const amount = parseImportAmount(cell(cells, columns.amount), mapping.decimalSeparator);
  if (!amount.ok) {
    errors.push(AMOUNT_ERRORS[amount.error] ?? 'amount_invalid');
  }

  let type: TransactionType | null = null;
  if (mapping.amountSign === 'type_column') {
    type = classifyImportType(cell(cells, columns.type));
    if (type === null) {
      errors.push('type_unknown');
    }
  } else if (mapping.amountSign === 'negative_is_expense') {
    if (amount.ok) {
      type = amount.negative ? 'expense' : 'income';
    }
  } else {
    type = mapping.amountSign === 'all_expenses' ? 'expense' : 'income';
  }
  if (amount.ok && amount.negative && mapping.amountSign !== 'negative_is_expense') {
    errors.push('amount_negative_ambiguous');
  }

  let status = mapping.defaultStatus;
  const statusText = cell(cells, columns.status);
  if (statusText !== '') {
    const classified = classifyImportStatus(statusText);
    if (classified === null) {
      errors.push('status_unknown');
    } else {
      status = classified;
    }
  }

  let categoryId: string | null = null;
  let subcategoryId: string | null = null;
  if (type !== null) {
    const index = categories[type];
    const categoryText = normalizeForMatch(cell(cells, columns.category));
    const subcategoryText = normalizeForMatch(cell(cells, columns.subcategory));
    const top = index.top.get(categoryText);
    const onlySub = index.sub.get(categoryText);
    if (top !== undefined) {
      categoryId = top.id;
    } else if (onlySub?.length === 1 && onlySub[0]?.parentCategoryId) {
      categoryId = onlySub[0].parentCategoryId;
      subcategoryId = onlySub[0].id;
    }
    if (categoryId !== null && subcategoryText !== '' && subcategoryId === null) {
      const match = (index.sub.get(subcategoryText) ?? []).find(
        (candidate) => candidate.parentCategoryId === categoryId,
      );
      if (match === undefined) {
        warnings.push('subcategory_ignored');
      } else {
        subcategoryId = match.id;
      }
    }
    if (categoryId === null) {
      const fallback = mapping.fallbackCategoryIds[type];
      if (fallback !== null && index.byId.has(fallback)) {
        categoryId = fallback;
        warnings.push('category_fallback');
      } else {
        errors.push('category_unmatched');
      }
    }
  }

  if (
    errors.length > 0 ||
    financialDate === null ||
    !amount.ok ||
    type === null ||
    categoryId === null
  ) {
    return { rowNumber, parsed: null, errors, duplicateOf: null };
  }
  return {
    rowNumber,
    parsed: {
      type,
      status,
      description,
      amountMinor: amount.amountMinor,
      financialDate,
      categoryId,
      subcategoryId,
      warnings,
    },
    errors: [],
    duplicateOf: null,
  };
}

export function buildCategoryIndexes(categories: readonly Category[]) {
  return {
    expense: indexCategories(categories, 'expense'),
    income: indexCategories(categories, 'income'),
  };
}

export function duplicateKey(row: Pick<ParsedImportRow, 'type' | 'financialDate' | 'amountMinor'>) {
  return `${row.type}|${row.financialDate}|${row.amountMinor}`;
}

export function markDuplicates(
  rows: EvaluatedRow[],
  existing: readonly {
    id: string;
    type: TransactionType;
    amountMinor: number;
    financialDate: string;
    description: string;
  }[],
): EvaluatedRow[] {
  const existingByKey = new Map<string, (typeof existing)[number]>();
  for (const transaction of existing) {
    const key = duplicateKey(transaction);
    if (!existingByKey.has(key)) {
      existingByKey.set(key, transaction);
    }
  }
  const firstRowByKey = new Map<string, number>();
  return rows.map((row) => {
    if (row.parsed === null) {
      return row;
    }
    const key = duplicateKey(row.parsed);
    const match = existingByKey.get(key);
    if (match !== undefined) {
      return {
        ...row,
        duplicateOf: {
          kind: 'transaction',
          transactionId: match.id,
          description: match.description,
        },
      };
    }
    const earlier = firstRowByKey.get(key);
    if (earlier !== undefined) {
      return { ...row, duplicateOf: { kind: 'row', rowNumber: earlier } };
    }
    firstRowByKey.set(key, row.rowNumber);
    return row;
  });
}
