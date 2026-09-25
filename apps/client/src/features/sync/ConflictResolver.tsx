import type { CategoryTreeItem, Tag } from '@personalfin/api-contract';
import {
  type FieldConflict,
  formatDisplayDate,
  formatMoney,
  formatMonthLabel,
  isValidMonth,
  type SyncFieldValue,
} from '@personalfin/domain';
import { useState } from 'react';

import { useCategories } from '../../api/categories';
import { useTags } from '../../api/tags';
import { messages } from '../../i18n/messages';
import type { ConflictDetail, OutboxEntry } from '../../sync/outbox';
import { type ConflictResolution, resolveConflict } from '../../sync/sync-engine';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { OptionGroup } from '../../ui/OptionGroup';

type Choice = 'local' | 'server';

const TYPE_LABELS: Record<string, string> = {
  expense: messages.transactions.expense,
  income: messages.transactions.income,
};

function categoryName(categories: readonly CategoryTreeItem[], id: string): string | undefined {
  for (const category of categories) {
    if (category.id === id) {
      return category.name;
    }
    const subcategory = category.subcategories.find((item) => item.id === id);
    if (subcategory !== undefined) {
      return subcategory.name;
    }
  }
  return undefined;
}

function useValueFormatter(spaceId: string) {
  const categories = useCategories(spaceId).data ?? [];
  const tags: readonly Tag[] = useTags(spaceId).data ?? [];
  const { conflict } = messages.sync;
  return (field: string, value: SyncFieldValue): string => {
    if (value === null || value === '') {
      return field === 'tagIds' ? conflict.noTags : conflict.empty;
    }
    if (field === 'amountMinor' && typeof value === 'number') {
      return formatMoney({ amountMinor: value, currency: 'BRL' }, 'pt-BR');
    }
    const text = String(value);
    if (field === 'financialDate') {
      return formatDisplayDate(text, 'pt-BR');
    }
    if (field === 'invoiceMonth' && isValidMonth(text)) {
      return formatMonthLabel(text, 'pt-BR');
    }
    if (field === 'categoryId' || field === 'subcategoryId') {
      return categoryName(categories, text) ?? conflict.empty;
    }
    if (field === 'tagIds') {
      return text
        .split(',')
        .map((id) => tags.find((tag) => tag.id === id)?.name ?? conflict.empty)
        .join(', ');
    }
    if (field === 'type') {
      return TYPE_LABELS[text] ?? text;
    }
    if (field === 'status') {
      return conflict.statuses[text] ?? text;
    }
    return text;
  };
}

function fieldLabel(field: string): string {
  return messages.sync.conflict.fields[field] ?? field;
}

interface ConflictResolverProps {
  entry: OutboxEntry;
  conflict: ConflictDetail;
}

export function ConflictResolver({ entry, conflict }: ConflictResolverProps) {
  const format = useValueFormatter(entry.spaceId);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [resolving, setResolving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function resolve(resolution: ConflictResolution): Promise<void> {
    setResolving(true);
    setMessage(null);
    const result = await resolveConflict(entry.id, resolution);
    setResolving(false);
    if (result === 'failed') {
      setMessage(messages.sync.conflict.failed);
    } else if (result === 'reopened') {
      setMessage(messages.sync.conflict.reopened);
    }
  }

  if (conflict.kind === 'fields') {
    const conflicts: FieldConflict[] = conflict.conflicts;
    const complete = conflicts.every((item) => choices[item.field] !== undefined);
    return (
      <>
        <BodyText>{messages.sync.conflict.fieldsIntro}</BodyText>
        {conflicts.map((item) => (
          <OptionGroup
            key={item.field}
            label={messages.sync.conflict.fieldChoice(fieldLabel(item.field))}
            options={[
              {
                value: 'local',
                label: messages.sync.conflict.mine(format(item.field, item.local)),
              },
              {
                value: 'server',
                label: messages.sync.conflict.theirs(format(item.field, item.server)),
              },
            ]}
            selected={choices[item.field] ?? null}
            onSelect={(choice) => setChoices((current) => ({ ...current, [item.field]: choice }))}
          />
        ))}
        {conflict.independent.length > 0 && (
          <BodyText muted>{messages.sync.conflict.independentNote}</BodyText>
        )}
        <FormError message={message} />
        <Button
          label={messages.sync.conflict.applyAction}
          disabled={!complete}
          loading={resolving}
          onPress={() =>
            void resolve({
              kind: 'fields',
              keepLocal: conflicts
                .filter((item) => choices[item.field] === 'local')
                .map((item) => item.field),
            })
          }
        />
      </>
    );
  }

  if (conflict.kind === 'edit-deleted') {
    return (
      <>
        <BodyText>{messages.sync.conflict.editDeletedIntro}</BodyText>
        <FormError message={message} />
        <Button
          label={messages.sync.conflict.restoreAction}
          loading={resolving}
          onPress={() => void resolve({ kind: 'restore' })}
        />
        <Button
          label={messages.sync.conflict.discardEditAction}
          variant="link"
          onPress={() => void resolve({ kind: 'discard' })}
        />
      </>
    );
  }

  return (
    <>
      <BodyText>{messages.sync.conflict.deleteEditedIntro}</BodyText>
      {conflict.changes.map((item) => (
        <BodyText key={item.field} muted>
          {messages.sync.conflict.change(
            fieldLabel(item.field),
            format(item.field, item.base),
            format(item.field, item.server),
          )}
        </BodyText>
      ))}
      <FormError message={message} />
      <Button
        label={messages.sync.conflict.deleteAnywayAction}
        variant="danger"
        loading={resolving}
        onPress={() => void resolve({ kind: 'delete-anyway' })}
      />
      <Button
        label={messages.sync.conflict.keepRecordAction}
        variant="link"
        onPress={() => void resolve({ kind: 'discard' })}
      />
    </>
  );
}
