import { Wallet } from '../../domain/wallet';
import { WalletRepository } from '../../application/ports/wallet.repository';

export class InMemoryWalletRepository implements WalletRepository {
  private readonly wallets = new Map<string, Wallet>();

  async findByPlayerId(playerId: string): Promise<Wallet | null> {
    return this.wallets.get(playerId) ?? null;
  }

  async save(wallet: Wallet): Promise<void> {
    this.wallets.set(wallet.playerId, wallet);
  }
}
