import { describe, expect, it, beforeEach } from 'bun:test';
import { EventTypes } from '@crash/shared';
import { WalletEventHandlers } from '../../src/application/handlers/wallet-event.handlers';
import { WalletService } from '../../src/application/wallet.service';
import { InMemoryWalletRepository } from '../../src/infrastructure/persistence/in-memory-wallet.repository';

describe('WalletEventHandlers', () => {
  let service: WalletService;
  let handlers: WalletEventHandlers;

  beforeEach(async () => {
    const repository = new InMemoryWalletRepository();
    service = new WalletService(repository);
    handlers = new WalletEventHandlers(service);
    await service.createWallet('player-1', 1000n);
  });

  it('returns BetReserved on successful bet placement', async () => {
    const result = await handlers.handleBetPlacedRequested({
      playerId: 'player-1',
      amountCents: '200',
      betId: 'bet-1',
      roundId: 'round-1',
    });

    expect(result.type).toBe(EventTypes.BET_RESERVED);
    expect(await service.getBalance('player-1')).toBe(800n);
  });

  it('returns CashoutPaid on successful cashout request', async () => {
    await handlers.handleBetPlacedRequested({
      playerId: 'player-1',
      amountCents: '200',
      betId: 'bet-1',
      roundId: 'round-1',
    });

    const result = await handlers.handleCashoutRequested({
      playerId: 'player-1',
      amountCents: '400',
      betId: 'bet-1',
      roundId: 'round-1',
      multiplier: '2.00',
    });

    expect(result.type).toBe(EventTypes.CASHOUT_PAID);
    expect(await service.getBalance('player-1')).toBe(1200n);
  });

  it('returns BetRejected when balance is insufficient', async () => {
    const result = await handlers.handleBetPlacedRequested({
      playerId: 'player-1',
      amountCents: '5000',
      betId: 'bet-2',
      roundId: 'round-1',
    });

    expect(result.type).toBe(EventTypes.BET_REJECTED);
    expect(await service.getBalance('player-1')).toBe(1000n);
  });

  it('refunds on bet rejected after reserve', async () => {
    await handlers.handleBetPlacedRequested({
      playerId: 'player-1',
      amountCents: '200',
      betId: 'bet-2',
      roundId: 'round-1',
    });

    await handlers.handleBetRejectedRefund({
      playerId: 'player-1',
      amountCents: '200',
      betId: 'bet-2',
      roundId: 'round-1',
      reason: 'GAME_CANCELLED',
    });

    expect(await service.getBalance('player-1')).toBe(1000n);
  });
});
