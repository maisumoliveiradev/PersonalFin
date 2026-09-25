import { getDocumentAsync } from 'expo-document-picker';

import { type PickedFile, SPREADSHEET_TYPES } from './pick-file-types';

export type { PickedFile };

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let index = 0; index < buffer.length; index += 0x8000) {
    binary += String.fromCharCode(...buffer.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

export async function pickSpreadsheet(): Promise<PickedFile | null> {
  const result = await getDocumentAsync({ type: SPREADSHEET_TYPES, base64: false });
  const asset = result.canceled ? undefined : result.assets[0];
  if (asset?.file === undefined) {
    return null;
  }
  return { name: asset.name, contentBase64: await blobToBase64(asset.file) };
}
