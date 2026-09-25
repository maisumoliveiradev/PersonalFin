import { formatDisplayDate } from '@personalfin/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { ApiRequestError } from '../../../../../api/api-client';
import { useCreateImport, useImports } from '../../../../../api/imports';
import { pickSpreadsheet } from '../../../../../features/imports/pick-file';
import { messages } from '../../../../../i18n/messages';
import { BodyText } from '../../../../../ui/BodyText';
import { Button } from '../../../../../ui/Button';
import { FormError } from '../../../../../ui/FormError';
import { ListItem } from '../../../../../ui/ListItem';
import { Screen } from '../../../../../ui/Screen';
import { SectionTitle } from '../../../../../ui/SectionTitle';
import { Title } from '../../../../../ui/Title';

function formatOf(name: string): 'csv' | 'xlsx' | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    return 'csv';
  }
  return lower.endsWith('.xlsx') ? 'xlsx' : null;
}

export default function ImportsScreen() {
  const router = useRouter();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const imports = useImports(spaceId);
  const createImport = useCreateImport(spaceId);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(): Promise<void> {
    setError(null);
    const file = await pickSpreadsheet().catch(() => null);
    if (file === null) {
      return;
    }
    const format = formatOf(file.name);
    if (format === null) {
      setError(messages.imports.unsupported);
      return;
    }
    try {
      const created = await createImport.mutateAsync({
        fileName: file.name,
        format,
        contentBase64: file.contentBase64,
      });
      router.push({
        pathname: '/spaces/[spaceId]/imports/[importId]',
        params: { spaceId, importId: created.id },
      });
    } catch (failure) {
      setError(
        (failure instanceof ApiRequestError && messages.imports.fileErrors[failure.code]) ||
          messages.imports.failed,
      );
    }
  }

  return (
    <Screen>
      <Title>{messages.imports.title}</Title>
      <BodyText muted>{messages.imports.hint}</BodyText>
      <FormError message={error} />
      <Button
        label={messages.imports.pickAction}
        loading={createImport.isPending}
        onPress={handlePick}
      />
      <SectionTitle>{messages.imports.historyTitle}</SectionTitle>
      {imports.isSuccess && imports.data.length === 0 && (
        <BodyText muted>{messages.imports.empty}</BodyText>
      )}
      {(imports.data ?? []).map((batch) => (
        <ListItem
          key={batch.id}
          title={`${batch.fileName} · ${formatDisplayDate(batch.createdAt.slice(0, 10), 'pt-BR')}`}
          subtitle={messages.imports.historyItem(
            messages.imports.statuses[batch.status] ?? batch.status,
            batch.rowCount,
            batch.importedCount,
          )}
          accessibilityHint={messages.imports.openHint}
          onPress={() =>
            router.push({
              pathname: '/spaces/[spaceId]/imports/[importId]',
              params: { spaceId, importId: batch.id },
            })
          }
        />
      ))}
      <Button
        label={messages.spaces.backToSpace}
        variant="link"
        onPress={() => router.dismissTo({ pathname: '/spaces/[spaceId]', params: { spaceId } })}
      />
    </Screen>
  );
}
