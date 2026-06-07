import { PlayerBetRecord } from '../../application/ports/bet.repository';
import type { BetRepository } from '../../application/ports/bet.repository';
import { InMemoryRoundRepository } from './in-memory-round.repository';

export class InMemoryBetRepository implements BetRepository {
  constructor(private readonly rounds: InMemoryRoundRepository) {}

  async findByPlayer(
    playerId: string,
    limit: number,
    offset: number,
  ): Promise<PlayerBetRecord[]> {
    const bets: PlayerBetRecord[] = [];

    for (const record of this.rounds.listAll()) {
      for (const bet of record.round.bets) {
        if (bet.playerId === playerId) {
          bets.push({ bet, createdAt: record.createdAt });
        }
      }
    }

    return bets
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);
  }
}
