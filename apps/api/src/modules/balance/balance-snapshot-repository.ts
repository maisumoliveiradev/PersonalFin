import type { BalanceSnapshot, NewBalanceSnapshot } from './balance-snapshot.ts';

export interface BalanceSnapshotRepository {
  record(snapshot: NewBalanceSnapshot): Promise<BalanceSnapshot>;
  listForSpace(financialSpaceId: string, limit: number): Promise<BalanceSnapshot[]>;
}
