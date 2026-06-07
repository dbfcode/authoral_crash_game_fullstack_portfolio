import { Pool } from 'pg';
import { WalletRepository } from '../../application/ports/wallet.repository';
import { Wallet } from '../../domain/wallet';
import { mapWalletFromRows } from './wallet.mapper';

export class PostgresWalletRepository implements WalletRepository {
  constructor(private readonly pool: Pool) {}

  async findByPlayerId(playerId: string): Promise<Wallet | null> {
    const walletResult = await this.pool.query(
      `SELECT player_id, balance_cents::text
       FROM wallets
       WHERE player_id = $1`,
      [playerId],
    );

    if (walletResult.rowCount === 0) {
      return null;
    }

    const walletRow = walletResult.rows[0];
    const ledgerResult = await this.pool.query(
      `SELECT le.type, le.amount_cents::text, le.reference, le.created_at
       FROM ledger_entries le
       INNER JOIN wallets w ON w.id = le.wallet_id
       WHERE w.player_id = $1
       ORDER BY le.created_at ASC`,
      [playerId],
    );

    return mapWalletFromRows(walletRow, ledgerResult.rows);
  }

  async save(wallet: Wallet): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const walletResult = await client.query(
        `INSERT INTO wallets (player_id, balance_cents)
         VALUES ($1, $2)
         ON CONFLICT (player_id)
         DO UPDATE SET balance_cents = EXCLUDED.balance_cents, updated_at = NOW()
         RETURNING id`,
        [wallet.playerId, wallet.balance.toString()],
      );

      const walletId = walletResult.rows[0].id as string;

      for (const entry of wallet.ledger) {
        await client.query(
          `INSERT INTO ledger_entries (wallet_id, type, amount_cents, reference, created_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (wallet_id, reference) DO NOTHING`,
          [
            walletId,
            entry.type,
            entry.amountCents.toString(),
            entry.reference,
            entry.createdAt,
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
}
