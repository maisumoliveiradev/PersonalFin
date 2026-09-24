import type { CategoryTreeItem, CreateTransactionRequest } from '@personalfin/api-contract';
import {
  DEFAULT_TRANSACTION_STATUS,
  financialDateFromLocalClock,
  formatDisplayDate,
  type TransactionStatus,
  type TransactionType,
} from '@personalfin/domain';
import { useState } from 'react';

import { ApiRequestError } from '../../api/api-client';
import { messages } from '../../i18n/messages';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { type Option, OptionGroup } from '../../ui/OptionGroup';
import { TextField } from '../../ui/TextField';
import { type TransactionFormValues, toCreateTransactionRequest } from './transaction-form';

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
  if (error instanceof ApiRequestError && error.code === 'VERSION_CONFLICT') {
    return messages.transactions.errors.versionConflict;
  }
  return messages.transactions.errors.unexpected;
}

export function emptyTransactionFormValues(): TransactionFormValues {
  return {
    type: 'expense',
    description: '',
    amount: '',
    date: formatDisplayDate(financialDateFromLocalClock(new Date()), 'pt-BR'),
    categoryId: null,
    subcategoryId: null,
    status: DEFAULT_TRANSACTION_STATUS,
  };
}

interface TransactionFormProps {
  categories: readonly CategoryTreeItem[];
  initialValues: TransactionFormValues;
  submitting: boolean;
  submitError: Error | null;
  onSubmit: (request: CreateTransactionRequest) => void;
  onCancel: () => void;
}

export function TransactionForm({
  categories,
  initialValues,
  submitting,
  submitError: submitFailure,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(initialValues.type);
  const [description, setDescription] = useState(initialValues.description);
  const [amount, setAmount] = useState(initialValues.amount);
  const [date, setDate] = useState(initialValues.date);
  const [categoryId, setCategoryId] = useState<string | null>(initialValues.categoryId);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(initialValues.subcategoryId);
  const [status, setStatus] = useState<TransactionStatus>(initialValues.status);
  const [validationError, setValidationError] = useState<string | null>(null);

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
    onSubmit(result.request);
  }

  const submitError = submitFailure === null ? null : describeSubmitError(submitFailure);

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
        loading={submitting}
      />
      <Button label={messages.transactions.cancelAction} variant="link" onPress={onCancel} />
    </>
  );
}
