export const SPACE_PERMISSIONS = [
  'view',
  'record',
  'plan',
  'classify',
  'manage_members',
  'view_audit',
] as const;

export type SpacePermission = (typeof SPACE_PERMISSIONS)[number];

export const PERMISSION_PRESETS = {
  viewer: ['view'],
  contributor: ['view', 'record'],
  administrator: SPACE_PERMISSIONS,
} as const satisfies Record<string, readonly SpacePermission[]>;

export type PermissionPreset = keyof typeof PERMISSION_PRESETS;

export const PERMISSION_PRESET_NAMES = Object.keys(PERMISSION_PRESETS) as PermissionPreset[];

export function isSpacePermission(value: string): value is SpacePermission {
  return (SPACE_PERMISSIONS as readonly string[]).includes(value);
}

export function normalizePermissions(permissions: readonly SpacePermission[]): SpacePermission[] {
  const selected = new Set<SpacePermission>(['view', ...permissions]);
  return SPACE_PERMISSIONS.filter((permission) => selected.has(permission));
}

export function presetOf(permissions: readonly SpacePermission[]): PermissionPreset | null {
  const normalized = normalizePermissions(permissions).join(',');
  return (
    PERMISSION_PRESET_NAMES.find(
      (preset) => normalizePermissions(PERMISSION_PRESETS[preset]).join(',') === normalized,
    ) ?? null
  );
}
