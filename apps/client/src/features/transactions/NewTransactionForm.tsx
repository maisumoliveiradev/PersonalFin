import type { CategoryTreeItem } from '@personalfin/api-contract';
import {
  DEFAULT_TRANSACTION_STATUS,
  financialDateFromLocalClock,
  formatDisplayDate,
  type TransactionStatus,
  type TransactionType,
} from '@personalfin/domain';
import { useState } from 'react';

import { ApiRequestError } from '../../api/api-client';
import { useCreateTransaction } from '../../api/transactions';
import { messages } from '../../i18n/messages';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { type Option, OptionGroup } from '../../ui/OptionGroup';
import { TextField } from '../../ui/TextField';
import { toCreateTransactionRequest } from './transaction-form';

const NO_SUBCATEGORY = 'none';

const TYPE_OPTIONS: readonly Option<TransactionType>[] = [
  { value: 'expense', label: messages.transactions.expense },
  { value: 'income', label: messages.transactions.income },
];

function statusOptions(type: TransactionType): Option<TransactionStatus>[] {
  const settledLabel =
    type === 'expense' ? messages.transactions.paidExpense : messages.transactions.receivedIncome;
  return [
    { value: 'paid', label: settledLabel },
    { value: 'pending', label: messages.transactions.pending },
  ];
}

function describeSubmitError(error: Error): string {
  if (error instanceof ApiRequestError && error.code === 'CATEGORY_NOT_AVAILABLE') {
    return messages.transactions.errors.categoryNotAvailable;
  }
  return messages.transactions.errors.unexpected;
}

interface NewTransactionFormProps {
  spaceId: string;
  categories: readonly CategoryTreeItem[];
  onSaved: () => void;
  onCancel: () => void;
}

export function NewTransactionForm({
  spaceId,
  categories,
  onSaved,
  onCancel,
}: NewTransactionFormProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() =>
    formatDisplayDate(financialDateFromLocalClock(new Date()), 'pt-BR'),
  );
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [status, setStatus] = useState<TransactionStatus>(DEFAULT_TRANSACTION_STATUS);
  const [validationError, setValidationError] = useState<string | null>(null);
  const createTransaction = useCreateTransaction(spaceId);

  const categoriesForType = categories.filter((category) => category.kind === type);
  const selectedCategory = categoriesForType.find((category) => category.id === categoryId);
  const subcategoryOptions: Option<string>[] = [
    { value: NO_SUBCATEGORY, label: messages.transactions.noSubcategory },
    ...(selectedCategory?.subcategories ?? []).map((subcategory) => ({
      value: subcategory.id,
      label: subcategory.name,
    })),
  ];

  function handleTypeChange(nextType: TransactionType): void {
    setType(nextType);
    setCategoryId(null);
    setSubcategoryId(null);
  }

  function handleCategoryChange(nextCategoryId: string): void {
    setCategoryId(nextCategoryId);
    setSubcategoryId(null);
  }

  function handleSubmit(): void {
    const result = toCreateTransactionRequest({
      type,
      description,
      amount,
      date,
      categoryId,
      subcategoryId,
      status,
    });
    if (!result.ok) {
      setValidationError(result.error);
      return;
    }
    setValidationError(null);
    createTransaction.mutate(result.request, { onSuccess: onSaved });
  }

  const submitError =
    createTransaction.error === null ? null : describeSubmitError(createTransaction.error);

  return (
    <>
      <OptionGroup
        label={messages.transactions.typeLabel}
        options={TYPE_OPTIONS}
        selected={type}
        onSelect={handleTypeChange}
      />
      <TextField
        label={messages.transactions.descriptionLabel}
        value={description}
        onChangeText={setDescription}
        maxLength={140}
      />
      <TextField
        label={messages.transactions.amountLabel}
        value={amount}
        onChangeText={setAmount}
        placeholder={messages.transactions.amountPlaceholder}
        inputMode="decimal"
        keyboardType="decimal-pad"
      />
      <TextField
        label={messages.transactions.dateLabel}
        hint={messages.transactions.dateHint}
        value={date}
        onChangeText={setDate}
        inputMode="numeric"
        maxLength={10}
      />
      <OptionGroup
        label={messages.transactions.categoryLabel}
        options={categoriesForType.map((category) => ({
          value: category.id,
          label: category.name,
        }))}
        selected={categoryId}
        onSelect={handleCategoryChange}
      />
      {selectedCategory !== undefined && selectedCategory.subcategories.length > 0 && (
        <OptionGroup
          label={messages.transactions.subcategoryLabel}
          options={subcategoryOptions}
          selected={subcategoryId ?? NO_SUBCATEGORY}
          onSelect={(value) => setSubcategoryId(value === NO_SUBCATEGORY ? null : value)}
        />
      )}
      <OptionGroup
        label={messages.transactions.statusLabel}
        options={statusOptions(type)}
        selected={status}
        onSelect={setStatus}
      />
      <FormError message={validationError ?? submitError} />
      <Button
        label={messages.transactions.saveAction}
        onPress={handleSubmit}
        loading={createTransaction.isPending}
      />
      <Button label={messages.transactions.cancelAction} variant="link" onPress={onCancel} />
    </>
  );
}
