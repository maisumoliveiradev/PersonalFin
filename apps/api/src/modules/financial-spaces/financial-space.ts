export const FINANCIAL_SPACE_NAME_MAX_LENGTH = 80;

export type FinancialSpaceLifecycleState = 'active';
export type FinancialSpaceRole = 'owner';

export interface FinancialSpace {
  id: string;
  name: string;
  ownerUserId: string;
  lifecycleState: FinancialSpaceLifecycleState;
  createdAt: Date;
}

export interface NewFinancialSpace {
  id: string;
  name: string;
  ownerUserId: string;
}

export function normalizeFinancialSpaceName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}
