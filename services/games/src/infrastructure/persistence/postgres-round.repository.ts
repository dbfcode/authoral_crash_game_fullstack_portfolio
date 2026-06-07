import { Pool } from 'pg';
import {
  RoundHistoryItem,
  RoundRecord,
} from '../../application/models/round-record';
import type { RoundRepository } from '../../application/ports/round.repository';
import {
  betToRow,
  mapRoundRecordFromRows,
  roundRecordToRow,
} from './round.mapper';

export class PostgresRoundRepository implements RoundRepository {
  constructor(private readonly pool: Pool) {}

  async findCurrent(): Promise<RoundRecord | null> {
    const result = await this.pool.query(
      `SELECT *
       FROM rounds
       WHERE status IN ('betting', 'running')
       ORDER BY created_at DESC
       LIMIT 1`,
    );

    if (result.rowCount === 0) {
      return null;
    }

    return this.loadRoundWithBets(result.rows[0]);
  }

  async findById(roundId: string): Promise<RoundRecord | null> {
    const result = await this.pool.query(`SELECT * FROM rounds WHERE id = $1`, [
      roundId,
    ]);

    if (result.rowCount === 0) {
      return null;
    }

    return this.loadRoundWithBets(result.rows[0]);
  }

  async findNextRound(roundId: string): Promise<RoundRecord | null> {
    const current = await this.findById(roundId);
    if (!current?.fairness.nextRoundHash) {
      return null;
    }

    const result = await this.pool.query(
      `SELECT * FROM rounds WHERE committed_round_hash = $1 LIMIT 1`,
      [current.fairness.nextRoundHash],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return this.loadRoundWithBets(result.rows[0]);
  }

  async findHistory(limit: number, offset: number): Promise<RoundHistoryItem[]> {
    const result = await this.pool.query(
      `SELECT id, status, crash_point, committed_round_hash, created_at
       FROM rounds
       WHERE status IN ('crashed', 'settled')
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    return result.rows.map((row) => ({
      roundId: row.id as string,
      status: row.status as string,
      crashPoint: row.crash_point as string | null,
      committedRoundHash: row.committed_round_hash as string,
      createdAt: row.created_at as Date,
    }));
  }

  async save(record: RoundRecord): Promise<void> {
    const client = await this.pool.connect();
    const roundRow = roundRecordToRow(record);

    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO rounds (
          id, status, committed_round_hash, next_round_hash, previous_round_hash,
          round_seed, crash_point, nonce, client_seed, algorithm_version,
          current_multiplier_hundredths, chain_index, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          committed_round_hash = EXCLUDED.committed_round_hash,
          next_round_hash = EXCLUDED.next_round_hash,
          previous_round_hash = EXCLUDED.previous_round_hash,
          round_seed = EXCLUDED.round_seed,
          crash_point = EXCLUDED.crash_point,
          nonce = EXCLUDED.nonce,
          client_seed = EXCLUDED.client_seed,
          algorithm_version = EXCLUDED.algorithm_version,
          current_multiplier_hundredths = EXCLUDED.current_multiplier_hundredths,
          chain_index = EXCLUDED.chain_index,
          updated_at = NOW()`,
        [
          roundRow.id,
          roundRow.status,
          roundRow.committed_round_hash,
          roundRow.next_round_hash,
          roundRow.previous_round_hash,
          roundRow.round_seed,
          roundRow.crash_point,
          roundRow.nonce,
          roundRow.client_seed,
          roundRow.algorithm_version,
          roundRow.current_multiplier_hundredths,
          roundRow.chain_index,
          roundRow.created_at,
        ],
      );

      await client.query(`DELETE FROM bets WHERE round_id = $1`, [record.round.id]);

      for (const bet of record.round.bets) {
        const betRow = betToRow(bet, record.createdAt);
        await client.query(
          `INSERT INTO bets (
            id, round_id, player_id, amount_cents, status,
            cashout_multiplier, payout_cents, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            betRow.id,
            betRow.round_id,
            betRow.player_id,
            betRow.amount_cents,
            betRow.status,
            betRow.cashout_multiplier,
            betRow.payout_cents,
            betRow.created_at,
          ],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async loadRoundWithBets(roundRow: Record<string, unknown>) {
    const betsResult = await this.pool.query(
      `SELECT * FROM bets WHERE round_id = $1 ORDER BY created_at ASC`,
      [roundRow.id],
    );

    return mapRoundRecordFromRows(
      roundRow as Parameters<typeof mapRoundRecordFromRows>[0],
      betsResult.rows as Parameters<typeof mapRoundRecordFromRows>[1],
    );
  }
}
