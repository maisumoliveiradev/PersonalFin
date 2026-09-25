import type { FinancialSpace, SpacePermission } from '@personalfin/api-contract';

import { messages } from '../../i18n/messages';

export function can(space: FinancialSpace | undefined, permission: SpacePermission): boolean {
  return space?.permissions.includes(permission) ?? false;
}

export function roleLabel(space: FinancialSpace): string {
  return space.role === 'owner' ? messages.spaces.ownerRole : messages.spaces.memberRole;
}
