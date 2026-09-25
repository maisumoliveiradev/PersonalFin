import type { ImportMapping } from '@personalfin/api-contract';
import { normalizeForMatch } from '@personalfin/domain';

type ColumnField = keyof ImportMapping['columns'];

const HINTS: Record<ColumnField, readonly string[]> = {
  date: ['data', 'date', 'dia', 'vencimento'],
  description: ['descricao', 'historico', 'description', 'lancamento', 'nome'],
  amount: ['valor', 'amount', 'quantia', 'total'],
  type: ['tipo', 'type', 'natureza'],
  category: ['categoria', 'category'],
  subcategory: ['subcategoria', 'subcategory'],
  status: ['situacao', 'status', 'pago'],
};

export function suggestMapping(header: readonly string[]): ImportMapping {
  const find = (field: ColumnField): number | null => {
    const index = header.findIndex((name) => HINTS[field].includes(normalizeForMatch(name)));
    return index === -1 ? null : index;
  };
  const type = find('type');
  return {
    hasHeader: true,
    columns: {
      date: find('date') ?? 0,
      description: find('description') ?? Math.min(1, Math.max(header.length - 1, 0)),
      amount: find('amount') ?? Math.min(2, Math.max(header.length - 1, 0)),
      type,
      category: find('category'),
      subcategory: find('subcategory'),
      status: find('status'),
    },
    dateFormat: 'DMY',
    decimalSeparator: ',',
    amountSign: type === null ? 'negative_is_expense' : 'type_column',
    fallbackCategoryIds: { expense: null, income: null },
    defaultStatus: 'paid',
  };
}
