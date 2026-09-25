import { launchCameraAsync, requestCameraPermissionsAsync } from 'expo-image-picker';

import type { PickedFile } from '../imports/pick-file-types';

export const CAN_TAKE_PHOTO = true;

export async function takePhoto(): Promise<PickedFile | null> {
  const permission = await requestCameraPermissionsAsync();
  if (!permission.granted) {
    return null;
  }
  const result = await launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
  const asset = result.canceled ? undefined : result.assets[0];
  if (asset?.base64 == null) {
    return null;
  }
  return { name: asset.fileName ?? `foto-${Date.now()}.jpg`, contentBase64: asset.base64 };
}
