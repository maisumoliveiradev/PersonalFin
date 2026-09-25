import { getDocumentAsync } from 'expo-document-picker';
import { File } from 'expo-file-system';

import { type PickedFile, SPREADSHEET_TYPES } from './pick-file-types';

export type { PickedFile };

export async function pickSpreadsheet(): Promise<PickedFile | null> {
  const result = await getDocumentAsync({ type: SPREADSHEET_TYPES, copyToCacheDirectory: true });
  const asset = result.canceled ? undefined : result.assets[0];
  if (asset === undefined) {
    return null;
  }
  return { name: asset.name, contentBase64: await new File(asset.uri).base64() };
}
