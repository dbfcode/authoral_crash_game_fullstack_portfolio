import { describe, expect, it, beforeEach } from 'bun:test';
import { GameQueryService } from '../../src/application/game-query.service';
import { RoundRecord } from '../../src/application/models/round-record';
import { Round } from '../../src/domain/round';
import { RoundStatus } from '../../src/domain/round-status';
import {
  buildFairnessProof,
  computeCrashPoint,
  PROVABLY_FAIR_ALGORITHM_VERSION,
  SeedChain,
} from '../../src/domain/provably-fair';
import { InMemoryBetRepository } from '../../src/infrastructure/persistence/in-memory-bet.repository';
import { InMemoryRoundRepository } from '../../src/infrastructure/persistence/in-memory-round.repository';

describe('GameQueryService', () => {
  let roundRepository: InMemoryRoundRepository;
  let service: GameQueryService;

  beforeEach(() => {
    roundRepository = new InMemoryRoundRepository();
    const betRepository = new InMemoryBetRepository(roundRepository);
    service = new GameQueryService(roundRepository, betRepository);
  });

  it('returns current round with committedRoundHash', async () => {
    await roundRepository.save({
      round: Round.create({ roundId: 'round-1' }),
      fairness: {
        committedRoundHash: 'hash-abc',
        nextRoundHash: 'hash-next',
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

    const current = await service.getCurrentRound();
    expect(current.roundId).toBe('round-1');
    expect(current.committedRoundHash).toBe('hash-abc');
    expect(current.nextRoundHash).toBe('hash-next');
  });

  it('verifyRound returns crashValid and chainValid for settled chain', async () => {
    const chain = SeedChain.fromSeeds(['seed-a', 'seed-b', 'seed-c']);
    const commit0 = chain.commit(0);
    const commit1 = chain.commit(1);
    const crash = computeCrashPoint({ roundSeed: commit0.roundSeed, nonce: 0 });

    const settledRound: RoundRecord = {
      round: Round.rehydrate({
        roundId: 'round-0',
        status: RoundStatus.SETTLED,
        bets: [],
        crashMultiplier: crash,
      }),
      fairness: {
        committedRoundHash: commit0.roundHash,
        nextRoundHash: commit0.nextRoundHash,
        previousRoundHash: null,
        roundSeed: commit0.roundSeed,
        crashPoint: crash.toDecimalString(),
        nonce: 0,
        clientSeed: null,
        algorithmVersion: PROVABLY_FAIR_ALGORITHM_VERSION,
        currentMultiplierHundredths: null,
        chainIndex: 0,
      },
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };

    const nextRound: RoundRecord = {
      round: Round.create({ roundId: 'round-1' }),
      fairness: {
        committedRoundHash: commit1.roundHash,
        nextRoundHash: commit1.nextRoundHash,
        previousRoundHash: commit0.roundHash,
        roundSeed: null,
        crashPoint: null,
        nonce: 1,
        clientSeed: null,
        algorithmVersion: PROVABLY_FAIR_ALGORITHM_VERSION,
        currentMultiplierHundredths: null,
        chainIndex: 1,
      },
      createdAt: new Date('2026-01-02T00:00:00Z'),
    };

    await roundRepository.save(settledRound);
    await roundRepository.save(nextRound);

    const proof = buildFairnessProof({
      roundId: 'round-0',
      commit: commit0,
      nonce: 0,
    });
    expect(proof.crashPoint).toBe(crash.toDecimalString());

    const verify = await service.verifyRound('round-0');
    expect(verify.crashValid).toBe(true);
    expect(verify.chainValid).toBe(true);
    expect(verify.valid).toBe(true);
  });
});
