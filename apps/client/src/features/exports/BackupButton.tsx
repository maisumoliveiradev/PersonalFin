import { useState } from 'react';

import { useDownloadBackup } from '../../api/exports';
import { messages } from '../../i18n/messages';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { StatusMessage } from '../../ui/StatusMessage';
import { saveFile } from '../files/save-file';

export function BackupButton() {
  const backup = useDownloadBackup();
  const [saved, setSaved] = useState<string | null>(null);

  async function run(): Promise<void> {
    setSaved(null);
    try {
      const file = await backup.mutateAsync();
      await saveFile(file.bytes, file.fileName, file.mimeType);
      setSaved(file.fileName);
    } catch {
      return;
    }
  }

  return (
    <>
      {saved !== null && <StatusMessage>{messages.backup.done(saved)}</StatusMessage>}
      <FormError message={backup.isError ? messages.backup.failed : null} />
      <Button
        label={messages.backup.action}
        variant="link"
        loading={backup.isPending}
        onPress={() => void run()}
      />
      <BodyText muted>{messages.backup.hint}</BodyText>
    </>
  );
}
