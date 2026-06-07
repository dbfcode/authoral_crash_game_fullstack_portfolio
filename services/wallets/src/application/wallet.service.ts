import {
  WalletAlreadyExistsError,
  WalletNotFoundError,
} from '../domain/errors';
import { Wallet } from '../domain/wallet';
import { WalletRepository } from './ports/wallet.repository';

export class WalletService {
  constructor(private readonly repository: WalletRepository) {}

  async createWallet(
    playerId: string,
    initialBalance = 0n,
  ): Promise<Wallet> {
    const existing = await this.repository.findByPlayerId(playerId);
    if (existing) {
      throw new WalletAlreadyExistsError(playerId);
    }

    const wallet = Wallet.create(playerId, initialBalance);
    await this.repository.save(wallet);
    return wallet;
  }

  async getBalance(playerId: string): Promise<bigint> {
    const wallet = await this.requireWallet(playerId);
    return wallet.balance;
  }

  async credit(
    playerId: string,
    amountCents: bigint,
    reference: string,
  ): Promise<void> {
    const wallet = await this.requireWallet(playerId);
    wallet.credit(amountCents, reference);
    await this.repository.save(wallet);
  }

  async debit(
    playerId: string,
    amountCents: bigint,
    reference: string,
  ): Promise<void> {
    const wallet = await this.requireWallet(playerId);
    wallet.debit(amountCents, reference);
    await this.repository.save(wallet);
  }

  private async requireWallet(playerId: string): Promise<Wallet> {
    const wallet = await this.repository.findByPlayerId(playerId);
    if (!wallet) {
      throw new WalletNotFoundError(playerId);
    }
    return wallet;
  }
}
