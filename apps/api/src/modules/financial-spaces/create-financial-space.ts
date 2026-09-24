import { randomUUID } from 'node:crypto';

import type { DataAccess } from '../../database/data-access.ts';
import { DEFAULT_CATEGORY_CATALOG } from '../categories/default-category-catalog.ts';
import type { FinancialSpace } from './financial-space.ts';

export interface CreateFinancialSpaceInput {
  name: string;
  ownerUserId: string;
}

export async function createFinancialSpace(
  data: DataAccess,
  input: CreateFinancialSpaceInput,
): Promise<FinancialSpace> {
  return data.transaction(async ({ financialSpaces, categories }) => {
    const space = await financialSpaces.create({ id: randomUUID(), ...input });
    await categories.seedDefaults(space.id, DEFAULT_CATEGORY_CATALOG);
    return space;
  });
}
