import { useState } from 'react';

import { type ExportFormat, useExportTransactions, useMonthlyReport } from '../../api/exports';
import { messages } from '../../i18n/messages';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { SectionTitle } from '../../ui/SectionTitle';
import { StatusMessage } from '../../ui/StatusMessage';
import { saveFile } from '../files/save-file';
import type { TransactionFilters } from '../transactions/transaction-filters';

interface ExportButtonsProps {
  spaceId: string;
  filters: TransactionFilters;
}

export function ExportButtons({ spaceId, filters }: ExportButtonsProps) {
  const exportTransactions = useExportTransactions(spaceId);
  const report = useMonthlyReport(spaceId);
  const [saved, setSaved] = useState<string | null>(null);

  async function run(format: ExportFormat): Promise<void> {
    setSaved(null);
    try {
      const file = await exportTransactions.mutateAsync({ format, filters });
      await saveFile(file.bytes, file.fileName, file.mimeType);
      setSaved(file.fileName);
    } catch {
      return;
    }
  }

  async function runReport(): Promise<void> {
    setSaved(null);
    try {
      const file = await report.mutateAsync(filters.month);
      await saveFile(file.bytes, file.fileName, file.mimeType);
      setSaved(file.fileName);
    } catch {
      return;
    }
  }

  return (
    <>
      <SectionTitle>{messages.exports.title}</SectionTitle>
      <BodyText muted>{messages.exports.hint}</BodyText>
      {saved !== null && <StatusMessage>{messages.exports.done(saved)}</StatusMessage>}
      <FormError
        message={exportTransactions.isError || report.isError ? messages.exports.failed : null}
      />
      <Button
        label={messages.exports.csvAction}
        accessibilityLabel={messages.exports.csvLabel}
        variant="link"
        loading={exportTransactions.isPending && exportTransactions.variables?.format === 'csv'}
        onPress={() => void run('csv')}
      />
      <Button
        label={messages.exports.xlsxAction}
        accessibilityLabel={messages.exports.xlsxLabel}
        variant="link"
        loading={exportTransactions.isPending && exportTransactions.variables?.format === 'xlsx'}
        onPress={() => void run('xlsx')}
      />
      <Button
        label={messages.exports.pdfAction}
        accessibilityLabel={messages.exports.pdfLabel}
        variant="link"
        loading={report.isPending}
        onPress={() => void runReport()}
      />
    </>
  );
}
