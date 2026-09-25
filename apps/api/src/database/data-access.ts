import type { AuditRepository } from '../modules/audit/audit-repository.ts';
import { createPostgresAuditRepository } from '../modules/audit/postgres-audit-repository.ts';
import type { BalanceReminderRepository } from '../modules/balance/balance-reminder-repository.ts';
import type { BalanceSnapshotRepository } from '../modules/balance/balance-snapshot-repository.ts';
import { createPostgresBalanceReminderRepository } from '../modules/balance/postgres-balance-reminder-repository.ts';
import { createPostgresBalanceSnapshotRepository } from '../modules/balance/postgres-balance-snapshot-repository.ts';
import type { InstallmentRepository } from '../modules/cards/card-installments.ts';
import type { CardInvoiceRepository } from '../modules/cards/card-invoice-repository.ts';
import type { CardRepository } from '../modules/cards/card-repository.ts';
import { createPostgresCardInvoiceRepository } from '../modules/cards/postgres-card-invoice-repository.ts';
import { createPostgresCardRepository } from '../modules/cards/postgres-card-repository.ts';
import { createPostgresInstallmentRepository } from '../modules/cards/postgres-installment-repository.ts';
import type { CategoryRepository } from '../modules/categories/category-repository.ts';
import { createPostgresCategoryRepository } from '../modules/categories/postgres-category-repository.ts';
import type { DashboardRepository } from '../modules/dashboard/dashboard-repository.ts';
import { createPostgresDashboardRepository } from '../modules/dashboard/postgres-dashboard-repository.ts';
import type { FinancialSpaceRepository } from '../modules/financial-spaces/financial-space-repository.ts';
import { createPostgresFinancialSpaceRepository } from '../modules/financial-spaces/postgres-financial-space-repository.ts';
import { createPostgresRecurrenceRepository } from '../modules/recurrences/postgres-recurrence-repository.ts';
import type { RecurrenceRepository } from '../modules/recurrences/recurrence-repository.ts';
import { createPostgresTagRepository } from '../modules/tags/postgres-tag-repository.ts';
import type { TagRepository } from '../modules/tags/tag-repository.ts';
import { createPostgresTransactionRepository } from '../modules/transactions/postgres-transaction-repository.ts';
import type { TransactionRepository } from '../modules/transactions/transaction-repository.ts';
import { type DatabasePool, type Queryable, withTransaction } from './pool.ts';

export interface Repositories {
  financialSpaces: FinancialSpaceRepository;
  categories: CategoryRepository;
  transactions: TransactionRepository;
  audit: AuditRepository;
  balanceSnapshots: BalanceSnapshotRepository;
  balanceReminders: BalanceReminderRepository;
  dashboard: DashboardRepository;
  recurrences: RecurrenceRepository;
  cards: CardRepository;
  cardInvoices: CardInvoiceRepository;
  installments: InstallmentRepository;
  tags: TagRepository;
}

export interface DataAccess {
  repositories: Repositories;
  transaction<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>;
}

function createPostgresRepositories(db: Queryable): Repositories {
  return {
    financialSpaces: createPostgresFinancialSpaceRepository(db),
    categories: createPostgresCategoryRepository(db),
    transactions: createPostgresTransactionRepository(db),
    audit: createPostgresAuditRepository(db),
    balanceSnapshots: createPostgresBalanceSnapshotRepository(db),
    balanceReminders: createPostgresBalanceReminderRepository(db),
    dashboard: createPostgresDashboardRepository(db),
    recurrences: createPostgresRecurrenceRepository(db),
    cards: createPostgresCardRepository(db),
    cardInvoices: createPostgresCardInvoiceRepository(db),
    installments: createPostgresInstallmentRepository(db),
    tags: createPostgresTagRepository(db),
  };
}

export function createPostgresDataAccess(pool: DatabasePool): DataAccess {
  return {
    repositories: createPostgresRepositories(pool),
    transaction: (work) =>
      withTransaction(pool, (client) => work(createPostgresRepositories(client))),
  };
}
