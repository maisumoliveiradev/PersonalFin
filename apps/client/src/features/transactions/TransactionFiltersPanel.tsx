import type {
  CategoryTreeItem,
  TransactionStatus,
  TransactionType,
} from '@personalfin/api-contract';
import { useState } from 'react';

import { messages } from '../../i18n/messages';
import { Button } from '../../ui/Button';
import { type Option, OptionGroup } from '../../ui/OptionGroup';
import { TextField } from '../../ui/TextField';
import type { TransactionFilters } from './transaction-filters';

const ALL = 'all';

const TYPE_OPTIONS: readonly Option<TransactionType | typeof ALL>[] = [
  { value: ALL, label: messages.transactions.all },
  { value: 'expense', label: messages.transactions.expenses },
  { value: 'income', label: messages.transactions.incomes },
];

const STATUS_OPTIONS: readonly Option<TransactionStatus | typeof ALL>[] = [
  { value: ALL, label: messages.transactions.allFemale },
  { value: 'paid', label: messages.transactions.settled },
  { value: 'pending', label: messages.transactions.pendings },
];

interface TransactionFiltersPanelProps {
  filters: TransactionFilters;
  categories: readonly CategoryTreeItem[];
  onChange: (filters: TransactionFilters) => void;
}

function withOptional<Key extends 'type' | 'status' | 'categoryId' | 'q'>(
  filters: TransactionFilters,
  key: Key,
  value: TransactionFilters[Key] | undefined,
): TransactionFilters {
  const next: TransactionFilters = { ...filters };
  delete next[key];
  return value === undefined ? next : { ...next, [key]: value };
}

export function TransactionFiltersPanel({
  filters,
  categories,
  onChange,
}: TransactionFiltersPanelProps) {
  const [search, setSearch] = useState(filters.q ?? '');
  const visibleCategories = categories.filter(
    (category) => filters.type === undefined || category.kind === filters.type,
  );
  const categoryOptions: Option<string>[] = [
    { value: ALL, label: messages.transactions.allFemale },
    ...visibleCategories.map((category) => ({ value: category.id, label: category.name })),
  ];

  function applySearch(): void {
    const trimmed = search.trim();
    onChange(withOptional(filters, 'q', trimmed === '' ? undefined : trimmed));
  }

  return (
    <>
      <OptionGroup
        label={messages.transactions.filterType}
        options={TYPE_OPTIONS}
        selected={filters.type ?? ALL}
        onSelect={(value) =>
          onChange(
            withOptional(
              withOptional(filters, 'categoryId', undefined),
              'type',
              value === ALL ? undefined : value,
            ),
          )
        }
      />
      <OptionGroup
        label={messages.transactions.filterStatus}
        options={STATUS_OPTIONS}
        selected={filters.status ?? ALL}
        onSelect={(value) =>
          onChange(withOptional(filters, 'status', value === ALL ? undefined : value))
        }
      />
      <OptionGroup
        label={messages.transactions.filterCategory}
        options={categoryOptions}
        selected={filters.categoryId ?? ALL}
        onSelect={(value) =>
          onChange(withOptional(filters, 'categoryId', value === ALL ? undefined : value))
        }
      />
      <TextField
        label={messages.transactions.searchLabel}
        value={search}
        onChangeText={setSearch}
        maxLength={100}
        onSubmitEditing={applySearch}
      />
      <Button label={messages.transactions.searchAction} variant="link" onPress={applySearch} />
      <Button
        label={messages.transactions.clearFiltersAction}
        variant="link"
        onPress={() => {
          setSearch('');
          onChange({ month: filters.month });
        }}
      />
    </>
  );
}
