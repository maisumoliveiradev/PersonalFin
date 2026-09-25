import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  type DecodedDocument,
  decodeDocument,
  documentKey,
  encodeDocument,
  type LocalSchema,
} from './local-document';

export async function loadDocument<Data>(
  schema: LocalSchema<Data>,
  userId: string,
): Promise<DecodedDocument<Data>> {
  return decodeDocument(schema, await AsyncStorage.getItem(documentKey(schema, userId)));
}

export async function saveDocument<Data>(
  schema: LocalSchema<Data>,
  userId: string,
  data: Data,
): Promise<void> {
  await AsyncStorage.setItem(documentKey(schema, userId), encodeDocument(schema, data));
}

export async function removeDocument<Data>(
  schema: LocalSchema<Data>,
  userId: string,
): Promise<void> {
  await AsyncStorage.removeItem(documentKey(schema, userId));
}
