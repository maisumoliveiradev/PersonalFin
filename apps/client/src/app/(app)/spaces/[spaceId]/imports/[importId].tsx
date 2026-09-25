import type { ImportRow } from '@personalfin/api-contract';
import { formatDisplayDate, formatMoney } from '@personalfin/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ApiRequestError } from '../../../../../api/api-client';
import { useCategories } from '../../../../../api/categories';
import {
  useDecideDuplicates,
  useImport,
  useImportCommand,
  useImportRows,
  useMapImport,
} from '../../../../../api/imports';
import { MappingForm } from '../../../../../features/imports/MappingForm';
import { suggestMapping } from '../../../../../features/imports/mapping-suggestion';
import { messages } from '../../../../../i18n/messages';
import { BodyText } from '../../../../../ui/BodyText';
import { Button } from '../../../../../ui/Button';
import { FormError } from '../../../../../ui/FormError';
import { LoadingScreen } from '../../../../../ui/LoadingScreen';
import { OptionGroup } from '../../../../../ui/OptionGroup';
import { Screen } from '../../../../../ui/Screen';
import { SectionTitle } from '../../../../../ui/SectionTitle';
import { StatusMessage } from '../../../../../ui/StatusMessage';
import { Title } from '../../../../../ui/Title';

function describeFailure(error: Error | null): string | null {
  if (error === null) {
    return null;
  }
  return (
    (error instanceof ApiRequestError && messages.imports.fileErrors[error.code]) ||
    messages.imports.failed
  );
}

function rowSummary(row: ImportRow): string {
  const parsed = row.parsed;
  if (parsed === null) {
    return messages.imports.invalidItem(row.rowNumber, row.cells.join(' | '));
  }
  return messages.imports.rowSummary(
    row.rowNumber,
    parsed.description,
    formatMoney({ amountMinor: parsed.amountMinor, currency: 'BRL' }, 'pt-BR'),
    formatDisplayDate(parsed.financialDate, 'pt-BR'),
  );
}

export default function ImportScreen() {
  const router = useRouter();
  const { spaceId, importId } = useLocalSearchParams<{ spaceId: string; importId: string }>();
  const batch = useImport(spaceId, importId);
  const categories = useCategories(spaceId);
  const mapImport = useMapImport(spaceId, importId);
  const decide = useDecideDuplicates(spaceId, importId);
  const confirm = useImportCommand(spaceId, importId, 'confirm');
  const undo = useImportCommand(spaceId, importId, 'undo');
  const discard = useImportCommand(spaceId, importId, 'discard');
  const mapped = batch.data?.mapping != null && batch.data.status === 'draft';
  const invalid = useImportRows(spaceId, importId, 'invalid', mapped);
  const duplicates = useImportRows(spaceId, importId, 'duplicates', mapped);

  if (batch.isPending || categories.isPending) {
    return <LoadingScreen />;
  }
  const back = (
    <Button
      label={messages.imports.backToImports}
      variant="link"
      onPress={() =>
        router.dismissTo({ pathname: '/spaces/[spaceId]/imports', params: { spaceId } })
      }
    />
  );
  if (batch.isError) {
    return (
      <Screen>
        <FormError message={messages.imports.failed} />
        {back}
      </Screen>
    );
  }

  const current = batch.data;
  const counts = current.counts;
  const failure = describeFailure(
    mapImport.error ?? decide.error ?? confirm.error ?? undo.error ?? discard.error,
  );

  return (
    <Screen>
      <Title>{current.fileName}</Title>
      <BodyText muted>{messages.imports.statuses[current.status] ?? current.status}</BodyText>
      <FormError message={failure} />
      {current.status === 'imported' && (
        <>
          <StatusMessage>{messages.imports.imported(current.importedCount)}</StatusMessage>
          <BodyText muted>{messages.imports.undoHint}</BodyText>
          <Button
            label={messages.imports.undoAction}
            variant="danger"
            loading={undo.isPending}
            onPress={() => undo.mutate(current.version)}
          />
        </>
      )}
      {current.status === 'undone' && <StatusMessage>{messages.imports.undone}</StatusMessage>}
      {current.status === 'discarded' && (
        <StatusMessage>{messages.imports.discarded}</StatusMessage>
      )}
      {current.status === 'draft' && (
        <>
          <MappingForm
            key={current.mapping === null ? 'suggested' : 'saved'}
            firstRows={current.firstRows}
            initial={current.mapping ?? suggestMapping(current.firstRows[0] ?? [])}
            categories={categories.data ?? []}
            submitting={mapImport.isPending}
            onSubmit={(mapping) => mapImport.mutate({ version: current.version, mapping })}
          />
          {counts !== null && (
            <>
              <StatusMessage>
                {messages.imports.summary(counts.valid, counts.invalid, counts.duplicates)}
              </StatusMessage>
              {(invalid.data?.items ?? []).length > 0 && (
                <SectionTitle>{messages.imports.invalidTitle}</SectionTitle>
              )}
              {(invalid.data?.items ?? []).map((row) => (
                <BodyText key={`invalid-${row.rowNumber}`}>
                  {messages.imports.invalidItem(
                    row.rowNumber,
                    row.errors.map((code) => messages.imports.errors[code] ?? code).join(', '),
                  )}
                </BodyText>
              ))}
              {(duplicates.data?.items ?? []).length > 0 && (
                <>
                  <SectionTitle>{messages.imports.duplicatesTitle}</SectionTitle>
                  <BodyText muted>{messages.imports.duplicatesHint}</BodyText>
                  <Button
                    label={messages.imports.importAllDuplicates}
                    variant="link"
                    onPress={() => decide.mutate({ version: current.version, all: 'import' })}
                  />
                  <Button
                    label={messages.imports.skipAllDuplicates}
                    variant="link"
                    onPress={() => decide.mutate({ version: current.version, all: 'skip' })}
                  />
                </>
              )}
              {(duplicates.data?.items ?? []).map((row) => (
                <OptionGroup
                  key={`duplicate-${row.rowNumber}`}
                  label={`${rowSummary(row)} — ${
                    row.duplicateOf?.kind === 'transaction'
                      ? messages.imports.duplicateOfTransaction(row.duplicateOf.description)
                      : messages.imports.duplicateOfRow(
                          row.duplicateOf?.kind === 'row' ? row.duplicateOf.rowNumber : 0,
                        )
                  }`}
                  options={[
                    { value: 'import', label: messages.imports.decisions.import },
                    { value: 'skip', label: messages.imports.decisions.skip },
                  ]}
                  selected={row.decision}
                  onSelect={(decision) =>
                    decide.mutate({
                      version: current.version,
                      decisions: [{ rowNumber: row.rowNumber, decision }],
                    })
                  }
                />
              ))}
              {counts.undecidedDuplicates > 0 && (
                <BodyText>{messages.imports.undecided(counts.undecidedDuplicates)}</BodyText>
              )}
              <Button
                label={messages.imports.confirmAction(counts.toImport)}
                disabled={counts.undecidedDuplicates > 0 || counts.toImport === 0}
                loading={confirm.isPending}
                onPress={() => confirm.mutate(current.version)}
              />
            </>
          )}
          <Button
            label={messages.imports.discardAction}
            variant="link"
            loading={discard.isPending}
            onPress={() => discard.mutate(current.version)}
          />
        </>
      )}
      {back}
    </Screen>
  );
}
