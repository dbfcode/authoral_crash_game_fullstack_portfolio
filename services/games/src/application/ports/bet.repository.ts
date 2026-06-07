import { Bet } from '../../domain/bet';

export type PlayerBetRecord = {
  bet: Bet;
  createdAt: Date;
};

export interface BetRepository {
  findByPlayer(
    playerId: string,
    limit: number,
    offset: number,
  ): Promise<PlayerBetRecord[]>;
}
