import type { Card, CategoryTreeItem, CreateTransactionRequest } from '@personalfin/api-contract';
import {
  candidateInvoiceMonths,
  DEFAULT_TRANSACTION_STATUS,
  defaultInvoiceMonth,
  type FinancialDate,
  financialDateFromLocalClock,
  formatDisplayDate,
  formatMonthLabel,
  type Month,
  type NonBusinessDayRule,
  parseDisplayDate,
  type RecurrenceFrequency,
  type TransactionStatus,
  type TransactionType,
} from '@personalfin/domain';
import { useState } from 'react';

import { ApiRequestError } from '../../api/api-client';
import { messages } from '../../i18n/messages';
import { BodyText } from '../../ui/BodyText';
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

const ACCOUNT = 'account';

function describeSubmitError(error: Error): string {
  if (error instanceof ApiRequestError && error.code === 'CARD_NOT_AVAILABLE') {
    return messages.cards.errors.cardNotAvailable;
  }
  if (error instanceof ApiRequestError && error.code === 'INVALID_CARD_PURCHASE') {
    return messages.cards.errors.invalidPurchase;
  }
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
    cardId: null,
    invoiceMonth: null,
    installments: '1',
  };
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function invoiceOptions(date: FinancialDate): Option<Month>[] {
  return candidateInvoiceMonths(date).map((month) => ({
    value: month,
    label: capitalize(formatMonthLabel(month, 'pt-BR')),
  }));
}

export interface RecurrenceChoice {
  frequency: RecurrenceFrequency;
  nonBusinessDayRule: NonBusinessDayRule;
  endDate: FinancialDate | null;
}

const NO_REPEAT = 'none';

const REPEAT_OPTIONS: readonly Option<RecurrenceFrequency | typeof NO_REPEAT>[] = [
  { value: NO_REPEAT, label: messages.recurrences.none },
  { value: 'monthly', label: messages.recurrences.monthly },
  { value: 'weekly', label: messages.recurrences.weekly },
  { value: 'yearly', label: messages.recurrences.yearly },
];

const RULE_OPTIONS: readonly Option<NonBusinessDayRule>[] = [
  { value: 'keep', label: messages.recurrences.keep },
  { value: 'previous', label: messages.recurrences.previous },
  { value: 'next', label: messages.recurrences.next },
];

interface TransactionFormProps {
  categories: readonly CategoryTreeItem[];
  initialValues: TransactionFormValues;
  submitting: boolean;
  submitError: Error | null;
  allowRecurrence?: boolean;
  cards?: readonly Card[];
  allowCardChoice?: boolean;
  onSubmit: (request: CreateTransactionRequest, recurrence: RecurrenceChoice | null) => void;
  onCancel: () => void;
}

export function TransactionForm({
  categories,
  initialValues,
  submitting,
  submitError: submitFailure,
  allowRecurrence = false,
  cards = [],
  allowCardChoice = false,
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
  const [repeat, setRepeat] = useState<RecurrenceFrequency | typeof NO_REPEAT>(NO_REPEAT);
  const [endDate, setEndDate] = useState('');
  const [rule, setRule] = useState<NonBusinessDayRule>('keep');
  const [cardId, setCardId] = useState<string | null>(initialValues.cardId);
  const [chosenInvoice, setChosenInvoice] = useState<Month | null>(initialValues.invoiceMonth);
  const [installments, setInstallments] = useState(initialValues.installments);

  const isCardPurchase = cardId !== null;
  const lockedToCard = initialValues.cardId !== null;
  const card = cards.find((item) => item.id === cardId);
  const purchaseDate = parseDisplayDate(date, 'pt-BR');
  const invoiceChoices = purchaseDate === null ? [] : invoiceOptions(purchaseDate);
  const suggestedInvoice =
    card === undefined || purchaseDate === null ? null : defaultInvoiceMonth(purchaseDate, card);
  const invoiceMonth =
    chosenInvoice !== null && invoiceChoices.some((option) => option.value === chosenInvoice)
      ? chosenInvoice
      : suggestedInvoice;
  const paymentOptions: Option<string>[] = [
    { value: ACCOUNT, label: messages.cards.accountPayment },
    ...cards.filter((item) => !item.archived).map((item) => ({ value: item.id, label: item.name })),
  ];

  const categoriesForType = categories.filter(
    (category) =>
      category.kind === type && (!category.archived || category.id === initialValues.categoryId),
  );
  const selectedCategory = categoriesForType.find((category) => category.id === categoryId);
  const subcategoryOptions: Option<string>[] = [
    { value: NO_SUBCATEGORY, label: messages.transactions.noSubcategory },
    ...(selectedCategory?.subcategories ?? [])
      .filter(
        (subcategory) => !subcategory.archived || subcategory.id === initialValues.subcategoryId,
      )
      .map((subcategory) => ({
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
      cardId,
      invoiceMonth,
      installments,
    });
    if (!result.ok) {
      setValidationError(result.error);
      return;
    }
    if (repeat === NO_REPEAT) {
      setValidationError(null);
      onSubmit(result.request, null);
      return;
    }
    let parsedEnd: FinancialDate | null = null;
    if (endDate.trim() !== '') {
      parsedEnd = parseDisplayDate(endDate, 'pt-BR');
      if (parsedEnd === null) {
        setValidationError(messages.recurrences.errors.endDateInvalid);
        return;
      }
      if (parsedEnd < result.request.financialDate) {
        setValidationError(messages.recurrences.errors.endBeforeStart);
        return;
      }
    }
    setValidationError(null);
    onSubmit(result.request, { frequency: repeat, nonBusinessDayRule: rule, endDate: parsedEnd });
  }

  const submitError = submitFailure === null ? null : describeSubmitError(submitFailure);

  return (
    <>
      {lockedToCard ? (
        <BodyText>{messages.cards.purchaseOn(card?.name ?? '')}</BodyText>
      ) : (
        <OptionGroup
          label={messages.transactions.typeLabel}
          options={TYPE_OPTIONS}
          selected={type}
          onSelect={handleTypeChange}
        />
      )}
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
      {subcategoryOptions.length > 1 && (
        <OptionGroup
          label={messages.transactions.subcategoryLabel}
          options={subcategoryOptions}
          selected={subcategoryId ?? NO_SUBCATEGORY}
          onSelect={(value) => setSubcategoryId(value === NO_SUBCATEGORY ? null : value)}
        />
      )}
      {allowCardChoice &&
        type === 'expense' &&
        repeat === NO_REPEAT &&
        paymentOptions.length > 1 && (
          <OptionGroup
            label={messages.cards.paymentLabel}
            options={paymentOptions}
            selected={cardId ?? ACCOUNT}
            onSelect={(value) => setCardId(value === ACCOUNT ? null : value)}
          />
        )}
      {isCardPurchase && invoiceChoices.length > 0 && (
        <OptionGroup
          label={messages.cards.invoiceLabel}
          options={invoiceChoices}
          selected={invoiceMonth}
          onSelect={setChosenInvoice}
        />
      )}
      {isCardPurchase && allowCardChoice && (
        <TextField
          label={messages.cards.installmentsLabel}
          hint={messages.cards.installmentsHint}
          value={installments}
          onChangeText={setInstallments}
          inputMode="numeric"
          maxLength={2}
        />
      )}
      {allowRecurrence && !isCardPurchase && (
        <OptionGroup
          label={messages.recurrences.repeatLabel}
          options={REPEAT_OPTIONS}
          selected={repeat}
          onSelect={setRepeat}
        />
      )}
      {repeat !== NO_REPEAT && (
        <>
          <TextField
            label={messages.recurrences.endDateLabel}
            hint={messages.recurrences.endDateHint}
            value={endDate}
            onChangeText={setEndDate}
            inputMode="numeric"
            maxLength={10}
          />
          <OptionGroup
            label={messages.recurrences.ruleLabel}
            options={RULE_OPTIONS}
            selected={rule}
            onSelect={setRule}
          />
        </>
      )}
      {repeat === NO_REPEAT && !isCardPurchase && (
        <OptionGroup
          label={messages.transactions.statusLabel}
          options={statusOptions(type)}
          selected={status}
          onSelect={setStatus}
        />
      )}
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
