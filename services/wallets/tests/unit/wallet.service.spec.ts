import { describe, expect, it, beforeEach } from 'bun:test';
import { WalletService } from '../../src/application/wallet.service';
import {
  WalletAlreadyExistsError,
  WalletNotFoundError,
} from '../../src/domain/errors';
import { InMemoryWalletRepository } from '../../src/infrastructure/persistence/in-memory-wallet.repository';

describe('WalletService', () => {
  let repository: InMemoryWalletRepository;
  let service: WalletService;

  beforeEach(() => {
    repository = new InMemoryWalletRepository();
    service = new WalletService(repository);
  });

  it('creates wallet for player', async () => {
    const wallet = await service.createWallet('player-1', 1000n);
    expect(wallet.playerId).toBe('player-1');
    expect(wallet.balance).toBe(1000n);
  });

  it('rejects duplicate wallet creation', async () => {
    await service.createWallet('player-1');
    await expect(service.createWallet('player-1')).rejects.toThrow(
      WalletAlreadyExistsError,
    );
  });

  it('returns balance for existing wallet', async () => {
    await service.createWallet('player-1', 500n);
    const balance = await service.getBalance('player-1');
    expect(balance).toBe(500n);
  });

  it('throws when wallet not found on getBalance', async () => {
    await expect(service.getBalance('missing')).rejects.toThrow(
      WalletNotFoundError,
    );
  });

  it('credits wallet and persists', async () => {
    await service.createWallet('player-1', 100n);
    await service.credit('player-1', 50n, 'win-1');
    expect(await service.getBalance('player-1')).toBe(150n);
  });

  it('debits wallet and persists', async () => {
    await service.createWallet('player-1', 100n);
    await service.debit('player-1', 40n, 'bet-1');
    expect(await service.getBalance('player-1')).toBe(60n);
  });

  it('throws when wallet not found on credit', async () => {
    await expect(service.credit('missing', 10n, 'ref')).rejects.toThrow(
      WalletNotFoundError,
    );
  });

  it('throws when wallet not found on debit', async () => {
    await expect(service.debit('missing', 10n, 'ref')).rejects.toThrow(
      WalletNotFoundError,
    );
  });
});
