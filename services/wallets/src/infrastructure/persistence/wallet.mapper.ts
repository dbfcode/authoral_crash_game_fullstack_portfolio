import { LedgerEntry, LedgerEntryType } from '../../domain/ledger-entry';
import { Wallet } from '../../domain/wallet';

export interface WalletRow {
  player_id: string;
  balance_cents: string;
}

export interface LedgerEntryRow {
  type: string;
  amount_cents: string;
  reference: string;
  created_at: Date;
}

export function mapWalletFromRows(
  walletRow: WalletRow,
  ledgerRows: LedgerEntryRow[],
): Wallet {
  const ledger = ledgerRows.map((row) =>
    LedgerEntry.rehydrate(
      row.type as LedgerEntryType,
      BigInt(row.amount_cents),
      row.reference,
      row.created_at,
    ),
  );

  return Wallet.rehydrate(
    walletRow.player_id,
    BigInt(walletRow.balance_cents),
    ledger,
  );
}
