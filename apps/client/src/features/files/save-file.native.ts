import { File, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';

export async function saveFile(
  bytes: ArrayBuffer,
  fileName: string,
  mimeType: string,
): Promise<void> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(new Uint8Array(bytes));
  await shareAsync(file.uri, { mimeType, dialogTitle: fileName });
}
