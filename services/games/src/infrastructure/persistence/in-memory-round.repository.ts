import { RoundHistoryItem, RoundRecord } from '../../application/models/round-record';
import type { RoundRepository } from '../../application/ports/round.repository';
import { RoundStatus } from '../../domain/round-status';

export class InMemoryRoundRepository implements RoundRepository {
  private readonly records = new Map<string, RoundRecord>();

  async findCurrent(): Promise<RoundRecord | null> {
    const active = [...this.records.values()]
      .filter(
        (record) =>
          record.round.status === RoundStatus.BETTING ||
          record.round.status === RoundStatus.RUNNING,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return active[0] ?? null;
  }

  async findById(roundId: string): Promise<RoundRecord | null> {
    return this.records.get(roundId) ?? null;
  }

  async findNextRound(roundId: string): Promise<RoundRecord | null> {
    const current = this.records.get(roundId);
    if (!current?.fairness.nextRoundHash) {
      return null;
    }

    return (
      [...this.records.values()].find(
        (record) =>
          record.fairness.committedRoundHash === current.fairness.nextRoundHash,
      ) ?? null
    );
  }

  async findHistory(limit: number, offset: number): Promise<RoundHistoryItem[]> {
    return [...this.records.values()]
      .filter(
        (record) =>
          record.round.status === RoundStatus.CRASHED ||
          record.round.status === RoundStatus.SETTLED,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit)
      .map((record) => ({
        roundId: record.round.id,
        status: record.round.status,
        crashPoint: record.fairness.crashPoint,
        committedRoundHash: record.fairness.committedRoundHash,
        createdAt: record.createdAt,
      }));
  }

  async save(record: RoundRecord): Promise<void> {
    this.records.set(record.round.id, record);
  }

  listAll(): RoundRecord[] {
    return [...this.records.values()];
  }
}
