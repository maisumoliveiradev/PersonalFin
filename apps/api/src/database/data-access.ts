import type { AnalyticsRepository } from '../modules/analytics/analytics-repository.ts';
import { createPostgresAnalyticsRepository } from '../modules/analytics/postgres-analytics-repository.ts';
import type { AuditRepository } from '../modules/audit/audit-repository.ts';
import { createPostgresAuditRepository } from '../modules/audit/postgres-audit-repository.ts';
import type { BackupRepository } from '../modules/backup/backup.ts';
import { createPostgresBackupRepository } from '../modules/backup/postgres-backup-repository.ts';
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
import type { DebtRepository } from '../modules/debts/debt-repository.ts';
import { createPostgresDebtRepository } from '../modules/debts/postgres-debt-repository.ts';
import type { ExchangeRateRepository } from '../modules/exchange-rates/exchange-rate.ts';
import { createPostgresExchangeRateRepository } from '../modules/exchange-rates/postgres-exchange-rate-repository.ts';
import type { FinancialSpaceRepository } from '../modules/financial-spaces/financial-space-repository.ts';
import { createPostgresFinancialSpaceRepository } from '../modules/financial-spaces/postgres-financial-space-repository.ts';
import type { GoalRepository } from '../modules/goals/goal.ts';
import { createPostgresGoalRepository } from '../modules/goals/postgres-goal-repository.ts';
import type { ImportRepository } from '../modules/imports/import-model.ts';
import { createPostgresImportRepository } from '../modules/imports/postgres-import-repository.ts';
import type { MemberRepository } from '../modules/members/member-repository.ts';
import { createPostgresMemberRepository } from '../modules/members/postgres-member-repository.ts';
import type { DashboardPreferenceRepository } from '../modules/preferences/dashboard-preference-repository.ts';
import { createPostgresDashboardPreferenceRepository } from '../modules/preferences/postgres-dashboard-preference-repository.ts';
import { createPostgresRecurrenceRepository } from '../modules/recurrences/postgres-recurrence-repository.ts';
import type { RecurrenceRepository } from '../modules/recurrences/recurrence-repository.ts';
import { createPostgresReminderRepository } from '../modules/reminders/postgres-reminder-repository.ts';
import type { ReminderRepository } from '../modules/reminders/reminder-repository.ts';
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
  analytics: AnalyticsRepository;
  dashboardPreferences: DashboardPreferenceRepository;
  members: MemberRepository;
  debts: DebtRepository;
  goals: GoalRepository;
  reminders: ReminderRepository;
  imports: ImportRepository;
  backup: BackupRepository;
  exchangeRates: ExchangeRateRepository;
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
    analytics: createPostgresAnalyticsRepository(db),
    dashboardPreferences: createPostgresDashboardPreferenceRepository(db),
    members: createPostgresMemberRepository(db),
    debts: createPostgresDebtRepository(db),
    goals: createPostgresGoalRepository(db),
    reminders: createPostgresReminderRepository(db),
    imports: createPostgresImportRepository(db),
    backup: createPostgresBackupRepository(db),
    exchangeRates: createPostgresExchangeRateRepository(db),
  };
}

export function createPostgresDataAccess(pool: DatabasePool): DataAccess {
  return {
    repositories: createPostgresRepositories(pool),
    transaction: (work) =>
      withTransaction(pool, (client) => work(createPostgresRepositories(client))),
  };
}
