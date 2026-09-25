import { useMutation } from '@tanstack/react-query';

import type { TransactionFilters } from '../features/transactions/transaction-filters';
import { ApiRequestError, apiClient } from './api-client';

export type ExportFormat = 'csv' | 'xlsx';

export const EXPORT_MIME_TYPES: Record<ExportFormat, string> = {
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export function useExportTransactions(spaceId: string) {
  return useMutation({
    mutationFn: async ({
      format,
      filters,
    }: {
      format: ExportFormat;
      filters: TransactionFilters;
    }) => {
      const result = await apiClient.GET('/financial-spaces/{spaceId}/exports/transactions', {
        params: { path: { spaceId }, query: { format, ...filters } },
        parseAs: 'arrayBuffer',
      });
      if (!result.response.ok || result.data === undefined) {
        throw new ApiRequestError(result.response.status, 'EXPORT_FAILED');
      }
      return {
        bytes: result.data as ArrayBuffer,
        fileName: `lancamentos-${filters.month}.${format}`,
        mimeType: EXPORT_MIME_TYPES[format],
      };
    },
  });
}
