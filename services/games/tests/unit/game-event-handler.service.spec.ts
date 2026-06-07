import { describe, expect, it, beforeEach } from 'bun:test';
import { BetStatus } from '../../src/domain/bet-status';
import { RoundStatus } from '../../src/domain/round-status';
import { Multiplier } from '../../src/domain/multiplier';
import { Round } from '../../src/domain/round';
import { GameEventHandlerService } from '../../src/application/handlers/game-event-handler.service';
import { InMemoryRoundRepository } from '../../src/infrastructure/persistence/in-memory-round.repository';
import { RoundLockService } from '../../src/application/round-lock.service';
import { NoopGameRealtimePublisher } from '../../src/infrastructure/websocket/noop-game-realtime.publisher';
import { PROVABLY_FAIR_ALGORITHM_VERSION } from '../../src/domain/provably-fair';

describe('GameEventHandlerService', () => {
  let repository: InMemoryRoundRepository;
  let handlers: GameEventHandlerService;

  beforeEach(async () => {
    repository = new InMemoryRoundRepository();
    handlers = new GameEventHandlerService(
      repository,
      new NoopGameRealtimePublisher(),
      new RoundLockService(),
    );

    const round = Round.create({ roundId: 'round-1' });
    round.placeBet({
      betId: 'bet-1',
      playerId: 'player-1',
      amountCents: 500n,
    });

    await repository.save({
      round,
      fairness: {
        committedRoundHash: 'hash-1',
        nextRoundHash: null,
        previousRoundHash: null,
        roundSeed: null,
        crashPoint: null,
        nonce: 0,
        clientSeed: null,
        algorithmVersion: PROVABLY_FAIR_ALGORITHM_VERSION,
        currentMultiplierHundredths: null,
        chainIndex: 0,
      },
      createdAt: new Date(),
    });
  });

  it('confirms pending bet on BetReserved', async () => {
    await handlers.handleBetReserved({
      betId: 'bet-1',
      playerId: 'player-1',
      roundId: 'round-1',
      amountCents: '500',
    });

    const record = await repository.findById('round-1');
    expect(record?.round.getBet('player-1')?.status).toBe(BetStatus.ACTIVE);
  });

  it('removes pending bet on BetRejected', async () => {
    await handlers.handleBetRejected({
      betId: 'bet-1',
      playerId: 'player-1',
      roundId: 'round-1',
      amountCents: '500',
      reason: 'INSUFFICIENT_BALANCE',
    });

    const record = await repository.findById('round-1');
    expect(record?.round.getBet('player-1')).toBeUndefined();
  });

  it('reverts cashout on CashoutRejected', async () => {
    const record = await repository.findById('round-1');
    record!.round.confirmBet('player-1');
    record!.round.startRunning();
    record!.round.cashOut({
      playerId: 'player-1',
      atMultiplier: Multiplier.fromDecimalString('1.50'),
    });
    await repository.save(record!);

    await handlers.handleCashoutRejected({
      betId: 'bet-1',
      playerId: 'player-1',
      roundId: 'round-1',
      amountCents: '750',
      reason: 'CREDIT_FAILED',
    });

    const updated = await repository.findById('round-1');
    expect(updated?.round.getBet('player-1')?.status).toBe(BetStatus.ACTIVE);
    expect(updated?.round.status).toBe(RoundStatus.RUNNING);
  });
});
