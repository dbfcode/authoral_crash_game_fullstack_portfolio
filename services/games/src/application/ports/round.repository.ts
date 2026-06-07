import { RoundHistoryItem, RoundRecord } from '../models/round-record';

export interface RoundRepository {
  findCurrent(): Promise<RoundRecord | null>;
  findById(roundId: string): Promise<RoundRecord | null>;
  findNextRound(roundId: string): Promise<RoundRecord | null>;
  findHistory(limit: number, offset: number): Promise<RoundHistoryItem[]>;
  save(record: RoundRecord): Promise<void>;
}
