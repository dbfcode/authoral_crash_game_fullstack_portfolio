import { Pool } from 'pg';
import type {
  BetRepository,
  PlayerBetRecord,
} from '../../application/ports/bet.repository';
import { mapBetFromRow } from './round.mapper';

export class PostgresBetRepository implements BetRepository {
  constructor(private readonly pool: Pool) {}

  async findByPlayer(
    playerId: string,
    limit: number,
    offset: number,
  ): Promise<PlayerBetRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM bets
       WHERE player_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [playerId, limit, offset],
    );

    return result.rows.map((row) => ({
      bet: mapBetFromRow(row as Parameters<typeof mapBetFromRow>[0]),
      createdAt: row.created_at as Date,
    }));
  }
}
