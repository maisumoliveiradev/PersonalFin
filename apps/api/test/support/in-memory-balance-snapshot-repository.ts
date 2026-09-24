import type { BalanceSnapshot } from '../../src/modules/balance/balance-snapshot.ts';
import type { BalanceSnapshotRepository } from '../../src/modules/balance/balance-snapshot-repository.ts';

export function createInMemoryBalanceSnapshotRepository(): BalanceSnapshotRepository & {
  snapshots: BalanceSnapshot[];
} {
  const snapshots: BalanceSnapshot[] = [];
  return {
    snapshots,
    async record(snapshot) {
      const recorded = {
        ...snapshot,
        recordedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, snapshots.length)),
      };
      snapshots.push(recorded);
      return recorded;
    },
    async listForSpace(financialSpaceId, limit) {
      return snapshots
        .filter((snapshot) => snapshot.financialSpaceId === financialSpaceId)
        .sort(
          (left, right) =>
            right.observedOn.localeCompare(left.observedOn) ||
            right.recordedAt.getTime() - left.recordedAt.getTime(),
        )
        .slice(0, limit);
    },
  };
}
