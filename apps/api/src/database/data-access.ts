import type { CategoryRepository } from '../modules/categories/category-repository.ts';
import { createPostgresCategoryRepository } from '../modules/categories/postgres-category-repository.ts';
import type { FinancialSpaceRepository } from '../modules/financial-spaces/financial-space-repository.ts';
import { createPostgresFinancialSpaceRepository } from '../modules/financial-spaces/postgres-financial-space-repository.ts';
import { type DatabasePool, type Queryable, withTransaction } from './pool.ts';

export interface Repositories {
  financialSpaces: FinancialSpaceRepository;
  categories: CategoryRepository;
}

export interface DataAccess {
  repositories: Repositories;
  transaction<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>;
}

function createPostgresRepositories(db: Queryable): Repositories {
  return {
    financialSpaces: createPostgresFinancialSpaceRepository(db),
    categories: createPostgresCategoryRepository(db),
  };
}

export function createPostgresDataAccess(pool: DatabasePool): DataAccess {
  return {
    repositories: createPostgresRepositories(pool),
    transaction: (work) =>
      withTransaction(pool, (client) => work(createPostgresRepositories(client))),
  };
}
