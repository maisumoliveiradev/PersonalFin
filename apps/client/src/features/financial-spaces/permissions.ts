import type { FinancialSpace, SpacePermission } from '@personalfin/api-contract';

import { messages } from '../../i18n/messages';

export function can(space: FinancialSpace | undefined, permission: SpacePermission): boolean {
  return space?.permissions.includes(permission) ?? false;
}

export function roleLabel(space: FinancialSpace): string {
  if (space.role === 'owner') {
    return messages.spaces.ownerRole;
  }
  return space.role === 'support' ? messages.spaces.supportRole : messages.spaces.memberRole;
}
