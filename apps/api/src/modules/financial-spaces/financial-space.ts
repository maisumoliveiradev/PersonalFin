import { SPACE_PERMISSIONS, type SpacePermission } from '@personalfin/domain';

export const FINANCIAL_SPACE_NAME_MAX_LENGTH = 80;

export type FinancialSpaceLifecycleState = 'active';
export type FinancialSpaceRole = 'owner' | 'member' | 'support';

export interface SpaceAccess {
  role: FinancialSpaceRole;
  permissions: SpacePermission[];
  supportGrantId?: string;
}

export const OWNER_ACCESS: SpaceAccess = { role: 'owner', permissions: [...SPACE_PERMISSIONS] };

export interface FinancialSpace {
  id: string;
  name: string;
  ownerUserId: string;
  lifecycleState: FinancialSpaceLifecycleState;
  createdAt: Date;
}

export interface AccessibleSpace extends FinancialSpace {
  access: SpaceAccess;
}

export interface NewFinancialSpace {
  id: string;
  name: string;
  ownerUserId: string;
}

export function normalizeFinancialSpaceName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}
