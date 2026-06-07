import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { RoundEngineService } from '../../src/application/round-engine.service';
import { GameStateService } from '../../src/application/game-state.service';
import { RoundLockService } from '../../src/application/round-lock.service';
import { RoundBootstrapService } from '../../src/application/round-bootstrap.service';
import { InMemoryChainStateRepository } from '../../src/infrastructure/persistence/in-memory-chain-state.repository';
import { InMemoryRoundRepository } from '../../src/infrastructure/persistence/in-memory-round.repository';
import { NoopGameRealtimePublisher } from '../../src/infrastructure/websocket/noop-game-realtime.publisher';
import {
  computeCrashPoint,
  PROVABLY_FAIR_ALGORITHM_VERSION,
} from '../../src/domain/provably-fair';
import { RoundStatus } from '../../src/domain/round-status';
import type { GameEventPublisher } from '../../src/application/ports/game-event.publisher';
import { BetLostSettledPayload } from '@crash/shared';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  timeoutMs = 10000,
  intervalMs = 20,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await fn();
    if (predicate(value)) {
      return value;
    }
    await sleep(intervalMs);
  }
  throw new Error('waitFor timeout');
}

describe('RoundEngineService', () => {
  let roundRepository: InMemoryRoundRepository;
  let gameState: GameStateService;
  let publisher: GameEventPublisher & {
    lostEvents: BetLostSettledPayload[];
  };
  let engine: RoundEngineService;

  beforeEach(async () => {
    process.env.GAMES_BETTING_DURATION_MS = '20';
    process.env.GAMES_MULTIPLIER_TICK_MS = '10';
    process.env.GAMES_MULTIPLIER_STEP_HUNDREDTHS = '500';

    roundRepository = new InMemoryRoundRepository();
    gameState = new GameStateService(new InMemoryChainStateRepository());
    await gameState.initialize();

    publisher = {
      lostEvents: [],
      async publishBetPlacedRequested() {},
      async publishCashoutRequested() {},
      async publishBetLostSettled(payload: BetLostSettledPayload) {
        this.lostEvents.push(payload);
      },
    };

    const realtime = new NoopGameRealtimePublisher();
    const bootstrap = new RoundBootstrapService(
      roundRepository,
      gameState,
      realtime,
    );
    await bootstrap.onModuleInit();

    engine = new RoundEngineService(
      roundRepository,
      publisher,
      realtime,
      gameState,
      new RoundLockService(),
    );
    await engine.onModuleInit();
  });

  afterEach(() => {
    engine.onModuleDestroy();
    delete process.env.GAMES_BETTING_DURATION_MS;
    delete process.env.GAMES_MULTIPLIER_TICK_MS;
    delete process.env.GAMES_MULTIPLIER_STEP_HUNDREDTHS;
  });

  it('runs full round cycle with computeCrashPoint and prepares next round', async () => {
    const initial = await roundRepository.findCurrent();
    expect(initial?.round.status).toBe(RoundStatus.BETTING);

    const chain = gameState.getChain();
    const commit = chain.commit(initial!.fairness.chainIndex);
    const expectedCrash = computeCrashPoint({
      roundSeed: commit.roundSeed,
      nonce: initial!.fairness.nonce,
    });

    const expectedNextHash = initial!.fairness.nextRoundHash;

    await waitFor(
      async () => roundRepository.findById(initial!.round.id),
      (record) => record?.round.status === RoundStatus.SETTLED,
      10000,
    );

    const settled = (await roundRepository.findById(initial!.round.id))!;
    expect(settled.round.status).toBe(RoundStatus.SETTLED);
    expect(settled.fairness.roundSeed).toBe(commit.roundSeed);
    expect(settled.fairness.crashPoint).toBe(expectedCrash.toDecimalString());

    const next = await roundRepository.findCurrent();
    expect(next?.round.id).not.toBe(initial!.round.id);
    expect(next?.round.status).toBe(RoundStatus.BETTING);
    expect(next?.fairness.committedRoundHash).toBe(expectedNextHash);
    expect(next?.fairness.previousRoundHash).toBe(
      initial!.fairness.committedRoundHash,
    );
    expect(next?.fairness.algorithmVersion).toBe(
      PROVABLY_FAIR_ALGORITHM_VERSION,
    );
  });
});
