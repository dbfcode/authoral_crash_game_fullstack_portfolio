import { Pool } from 'pg';
import {
  ChainStateRepository,
  ChainStateSnapshot,
} from '../../application/ports/chain-state.repository';

export class PostgresChainStateRepository implements ChainStateRepository {
  constructor(private readonly pool: Pool) {}

  async load(): Promise<ChainStateSnapshot | null> {
    const result = await this.pool.query(
      'SELECT seeds, current_index FROM chain_state WHERE id = 1',
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0]!;
    return {
      seeds: row.seeds as string[],
      currentIndex: row.current_index as number,
    };
  }

  async save(snapshot: ChainStateSnapshot): Promise<void> {
    await this.pool.query(
      `INSERT INTO chain_state (id, seeds, current_index)
       VALUES (1, $1::jsonb, $2)
       ON CONFLICT (id) DO UPDATE SET
         seeds = EXCLUDED.seeds,
         current_index = EXCLUDED.current_index`,
      [JSON.stringify(snapshot.seeds), snapshot.currentIndex],
    );
  }
}
