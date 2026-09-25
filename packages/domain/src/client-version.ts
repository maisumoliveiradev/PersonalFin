export type ClientVersion = readonly [major: number, minor: number, patch: number];

const VERSION_PATTERN = /^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/;

export function parseClientVersion(value: string): ClientVersion | null {
  const match = VERSION_PATTERN.exec(value.trim());
  if (match === null) {
    return null;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareClientVersions(left: ClientVersion, right: ClientVersion): number {
  for (let index = 0; index < 3; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) {
      return Math.sign(difference);
    }
  }
  return 0;
}

export function isClientVersionSupported(
  clientVersion: string | undefined,
  minimum: ClientVersion,
): boolean {
  const parsed = clientVersion === undefined ? null : parseClientVersion(clientVersion);
  return parsed !== null && compareClientVersions(parsed, minimum) >= 0;
}
