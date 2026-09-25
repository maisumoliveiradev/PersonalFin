import type { CategoryTreeItem, ImportMapping } from '@personalfin/api-contract';
import { useState } from 'react';

import { messages } from '../../i18n/messages';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { type Option, OptionGroup } from '../../ui/OptionGroup';
import { SectionTitle } from '../../ui/SectionTitle';

type ColumnField = keyof ImportMapping['columns'];
const REQUIRED: readonly ColumnField[] = ['date', 'description', 'amount'];
const OPTIONAL: readonly ColumnField[] = ['type', 'category', 'subcategory', 'status'];
const NONE = 'none';

interface MappingFormProps {
  firstRows: readonly (readonly string[])[];
  initial: ImportMapping;
  categories: readonly CategoryTreeItem[];
  submitting: boolean;
  onSubmit: (mapping: ImportMapping) => void;
}

export function MappingForm({
  firstRows,
  initial,
  categories,
  submitting,
  onSubmit,
}: MappingFormProps) {
  const [mapping, setMapping] = useState<ImportMapping>(initial);
  const width = Math.max(...firstRows.map((row) => row.length), 1);
  const header = firstRows[0] ?? [];
  const columnOptions: Option<string>[] = Array.from({ length: width }, (_, index) => ({
    value: String(index),
    label: messages.imports.column(index, mapping.hasHeader ? (header[index] ?? '') : ''),
  }));
  const categoryOptions = (kind: 'expense' | 'income'): Option<string>[] => [
    { value: NONE, label: messages.imports.fallbackNone },
    ...categories
      .filter((category) => category.kind === kind && !category.archived)
      .map((category) => ({ value: category.id, label: category.name })),
  ];
  const setColumn = (field: ColumnField, value: string) =>
    setMapping((current) => ({
      ...current,
      columns: { ...current.columns, [field]: value === NONE ? null : Number(value) },
    }));

  return (
    <>
      <SectionTitle>{messages.imports.mappingTitle}</SectionTitle>
      <BodyText muted>{messages.imports.mappingHint}</BodyText>
      <OptionGroup
        label={messages.imports.headerLabel}
        options={[
          { value: 'yes', label: messages.imports.yes },
          { value: 'no', label: messages.imports.no },
        ]}
        selected={mapping.hasHeader ? 'yes' : 'no'}
        onSelect={(value) => setMapping((current) => ({ ...current, hasHeader: value === 'yes' }))}
      />
      {REQUIRED.map((field) => (
        <OptionGroup
          key={field}
          label={messages.imports.fields[field]}
          options={columnOptions}
          selected={String(mapping.columns[field])}
          onSelect={(value) => setColumn(field, value)}
        />
      ))}
      {OPTIONAL.map((field) => (
        <OptionGroup
          key={field}
          label={messages.imports.fields[field]}
          options={[{ value: NONE, label: messages.imports.none }, ...columnOptions]}
          selected={mapping.columns[field] === null ? NONE : String(mapping.columns[field])}
          onSelect={(value) => setColumn(field, value)}
        />
      ))}
      <OptionGroup
        label={messages.imports.dateFormatLabel}
        options={[
          { value: 'DMY', label: messages.imports.dateFormats.DMY },
          { value: 'YMD', label: messages.imports.dateFormats.YMD },
        ]}
        selected={mapping.dateFormat}
        onSelect={(dateFormat) => setMapping((current) => ({ ...current, dateFormat }))}
      />
      <OptionGroup
        label={messages.imports.decimalLabel}
        options={(['.', ','] as const).map((value) => ({
          value,
          label: messages.imports.decimals[value] ?? value,
        }))}
        selected={mapping.decimalSeparator}
        onSelect={(decimalSeparator) => setMapping((current) => ({ ...current, decimalSeparator }))}
      />
      <OptionGroup
        label={messages.imports.signLabel}
        options={(
          ['negative_is_expense', 'type_column', 'all_expenses', 'all_income'] as const
        ).map((value) => ({ value, label: messages.imports.signs[value] ?? value }))}
        selected={mapping.amountSign}
        onSelect={(amountSign) => setMapping((current) => ({ ...current, amountSign }))}
      />
      <OptionGroup
        label={messages.imports.fallbackExpenseLabel}
        options={categoryOptions('expense')}
        selected={mapping.fallbackCategoryIds.expense ?? NONE}
        onSelect={(value) =>
          setMapping((current) => ({
            ...current,
            fallbackCategoryIds: {
              ...current.fallbackCategoryIds,
              expense: value === NONE ? null : value,
            },
          }))
        }
      />
      <OptionGroup
        label={messages.imports.fallbackIncomeLabel}
        options={categoryOptions('income')}
        selected={mapping.fallbackCategoryIds.income ?? NONE}
        onSelect={(value) =>
          setMapping((current) => ({
            ...current,
            fallbackCategoryIds: {
              ...current.fallbackCategoryIds,
              income: value === NONE ? null : value,
            },
          }))
        }
      />
      <OptionGroup
        label={messages.imports.defaultStatusLabel}
        options={[
          { value: 'paid', label: messages.transactions.paidExpense },
          { value: 'pending', label: messages.transactions.pending },
        ]}
        selected={mapping.defaultStatus}
        onSelect={(defaultStatus) => setMapping((current) => ({ ...current, defaultStatus }))}
      />
      <Button
        label={messages.imports.validateAction}
        loading={submitting}
        onPress={() => onSubmit(mapping)}
      />
    </>
  );
}
