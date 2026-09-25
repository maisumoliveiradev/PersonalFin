export type LocalMigration = (data: unknown) => unknown;

export interface LocalSchema<Data> {
  name: string;
  version: number;
  migrations: Readonly<Record<number, LocalMigration>>;
  isValid: (data: unknown) => data is Data;
}

export type DecodedDocument<Data> =
  | { status: 'empty' }
  | { status: 'ready'; data: Data; migrated: boolean }
  | { status: 'newer'; version: number }
  | { status: 'unreadable' };

interface StoredEnvelope {
  schemaVersion: number;
  data: unknown;
}

function isEnvelope(value: unknown): value is StoredEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    'schemaVersion' in value &&
    Number.isInteger(value.schemaVersion) &&
    'data' in value
  );
}

export function encodeDocument<Data>(schema: LocalSchema<Data>, data: Data): string {
  return JSON.stringify({ schemaVersion: schema.version, data } satisfies StoredEnvelope);
}

export function decodeDocument<Data>(
  schema: LocalSchema<Data>,
  raw: string | null,
): DecodedDocument<Data> {
  if (raw === null || raw === '') {
    return { status: 'empty' };
  }
  let envelope: unknown;
  try {
    envelope = JSON.parse(raw);
  } catch {
    return { status: 'unreadable' };
  }
  if (!isEnvelope(envelope) || envelope.schemaVersion < 1) {
    return { status: 'unreadable' };
  }
  if (envelope.schemaVersion > schema.version) {
    return { status: 'newer', version: envelope.schemaVersion };
  }
  let data = envelope.data;
  for (let version = envelope.schemaVersion; version < schema.version; version += 1) {
    const migrate = schema.migrations[version];
    if (migrate === undefined) {
      return { status: 'unreadable' };
    }
    try {
      data = migrate(data);
    } catch {
      return { status: 'unreadable' };
    }
  }
  if (!schema.isValid(data)) {
    return { status: 'unreadable' };
  }
  return { status: 'ready', data, migrated: envelope.schemaVersion !== schema.version };
}

export function documentKey(schema: LocalSchema<unknown>, userId: string): string {
  return `personalfin:${schema.name}:${userId}`;
}
