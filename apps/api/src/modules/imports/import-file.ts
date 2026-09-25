import { parse } from 'csv-parse/sync';
import { readSheet } from 'read-excel-file/node';

export const IMPORT_FORMATS = ['csv', 'xlsx'] as const;
export type ImportFormat = (typeof IMPORT_FORMATS)[number];

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5000;

export type CsvDelimiter = ';' | ',' | '\t';
export type TextEncoding = 'utf-8' | 'latin1';

export interface ImportFileContent {
  rows: string[][];
  delimiter: CsvDelimiter | null;
  encoding: TextEncoding | null;
}

export class UnreadableImportFileError extends Error {
  override name = 'UnreadableImportFileError';
}

function decode(bytes: Uint8Array): { text: string; encoding: TextEncoding } {
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'utf-8' };
  } catch {
    return { text: new TextDecoder('latin1').decode(bytes), encoding: 'latin1' };
  }
}

function detectDelimiter(text: string): CsvDelimiter {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const candidates: CsvDelimiter[] = [';', '\t', ','];
  let best: CsvDelimiter = ';';
  let bestCount = -1;
  for (const candidate of candidates) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

function isEmptyRow(row: readonly string[]): boolean {
  return row.every((cell) => cell.trim() === '');
}

function readCsv(bytes: Uint8Array): ImportFileContent {
  const { text, encoding } = decode(bytes);
  const content = text.replace(/^﻿/, '');
  const delimiter = detectDelimiter(content);
  try {
    const rows = parse(content, {
      delimiter,
      relax_column_count: true,
      relax_quotes: true,
      skip_empty_lines: true,
    }) as string[][];
    return { rows: rows.filter((row) => !isEmptyRow(row)), delimiter, encoding };
  } catch (error) {
    throw new UnreadableImportFileError(error instanceof Error ? error.message : 'csv');
  }
}

function cellText(cell: unknown): string {
  if (cell === null || cell === undefined) {
    return '';
  }
  if (cell instanceof Date) {
    return Number.isNaN(cell.getTime()) ? '' : cell.toISOString().slice(0, 10);
  }
  return String(cell);
}

async function readXlsx(bytes: Uint8Array): Promise<ImportFileContent> {
  try {
    const data = await readSheet(Buffer.from(bytes), { parseNumber: (value: string) => value });
    const rows = data.map((row) => row.map(cellText));
    return { rows: rows.filter((row) => !isEmptyRow(row)), delimiter: null, encoding: null };
  } catch (error) {
    throw new UnreadableImportFileError(error instanceof Error ? error.message : 'xlsx');
  }
}

export async function readImportFile(
  format: ImportFormat,
  bytes: Uint8Array,
): Promise<ImportFileContent> {
  return format === 'csv' ? readCsv(bytes) : readXlsx(bytes);
}
