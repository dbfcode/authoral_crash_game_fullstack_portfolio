import { describe, expect, it } from 'bun:test';
import { RoundStatus } from '../../src/domain/round-status';
import { Multiplier } from '../../src/domain/multiplier';
import { Round } from '../../src/domain/round';
import {
  buildFairnessProof,
  computeCrashPoint,
  hashRoundSeed,
  SeedChain,
  verifyRound,
} from '../../src/domain/provably-fair';

/** Fixed regression vector — do not change without updating expected crash. */
const FIXED_ROUND_SEED =
  'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';
const FIXED_NONCE = 42;

describe('computeCrashPoint', () => {
  it('is deterministic for the same inputs', () => {
    const a = computeCrashPoint({ roundSeed: FIXED_ROUND_SEED, nonce: FIXED_NONCE });
    const b = computeCrashPoint({ roundSeed: FIXED_ROUND_SEED, nonce: FIXED_NONCE });
    expect(a.toDecimalString()).toBe(b.toDecimalString());
  });

  it('matches fixed regression vector', () => {
    const crash = computeCrashPoint({
      roundSeed: FIXED_ROUND_SEED,
      nonce: FIXED_NONCE,
    });
    expect(crash.toDecimalString()).toBe('1.17');
  });

  it('produces different results for different nonces', () => {
    const a = computeCrashPoint({ roundSeed: FIXED_ROUND_SEED, nonce: 1 });
    const b = computeCrashPoint({ roundSeed: FIXED_ROUND_SEED, nonce: 2 });
    expect(a.toDecimalString()).not.toBe(b.toDecimalString());
  });

  it('clientSeed changes crash when provided', () => {
    const without = computeCrashPoint({
      roundSeed: FIXED_ROUND_SEED,
      nonce: FIXED_NONCE,
    });
    const withClient = computeCrashPoint({
      roundSeed: FIXED_ROUND_SEED,
      nonce: FIXED_NONCE,
      clientSeed: 'player-seed',
    });
    expect(without.toDecimalString()).not.toBe(withClient.toDecimalString());
  });

  it('never returns multiplier below 1.00x', () => {
    for (let nonce = 0; nonce < 200; nonce += 1) {
      const crash = computeCrashPoint({ roundSeed: FIXED_ROUND_SEED, nonce });
      expect(crash.hundredths).toBeGreaterThanOrEqual(100n);
    }
  });

  it('caps crash at GAMES_MAX_CRASH_MULTIPLIER', () => {
    process.env.GAMES_MAX_CRASH_MULTIPLIER = '100.00';
    try {
      for (let nonce = 0; nonce < 500; nonce += 1) {
        const crash = computeCrashPoint({ roundSeed: FIXED_ROUND_SEED, nonce });
        expect(crash.hundredths).toBeLessThanOrEqual(10_000n);
      }
    } finally {
      delete process.env.GAMES_MAX_CRASH_MULTIPLIER;
    }
  });
});

describe('hashRoundSeed', () => {
  it('produces stable SHA-256 hex', () => {
    expect(hashRoundSeed('test-seed')).toBe(
      'd63cd08d82aa4eb48e0cc64fb466e909bfc3879664c5caa8d8cdeda73c044190',
    );
  });
});

describe('SeedChain', () => {
  const seeds = ['seed-a', 'seed-b', 'seed-c'] as const;

  it('commit returns roundHash and nextRoundHash without revealing next seed early', () => {
    const chain = SeedChain.fromSeeds(seeds);
    const commit = chain.commit(0);

    expect(commit.roundSeed).toBe('seed-a');
    expect(commit.roundHash).toBe(hashRoundSeed('seed-a'));
    expect(commit.nextRoundHash).toBe(hashRoundSeed('seed-b'));
  });

  it('last round has null nextRoundHash', () => {
    const chain = SeedChain.fromSeeds(seeds);
    const commit = chain.commit(2);

    expect(commit.nextRoundHash).toBeNull();
  });

  it('advance moves current index', () => {
    const chain = SeedChain.fromSeeds(seeds);
    expect(chain.currentIndex).toBe(0);

    const next = chain.advance();
    expect(chain.currentIndex).toBe(1);
    expect(next.roundSeed).toBe('seed-b');
  });

  it('generate creates requested number of seeds', () => {
    const chain = SeedChain.generate(5);
    expect(chain.seedsCount).toBe(5);
    expect(chain.commit().roundSeed.length).toBe(64);
  });
});

describe('verifyRound', () => {
  const chain = SeedChain.fromSeeds(['seed-a', 'seed-b', 'seed-c']);
  const commit0 = chain.commit(0);
  const commit1 = chain.commit(1);

  function proofFor(commit: ReturnType<SeedChain['commit']>, roundId: string) {
    return buildFairnessProof({
      roundId,
      commit,
      nonce: 1,
    });
  }

  it('accepts valid proof from computeCrashPoint', () => {
    const proof = proofFor(commit0, 'round-1');
    const result = verifyRound(proof, { nextRoundSeed: commit1.roundSeed });

    expect(result.valid).toBe(true);
    expect(result.crashValid).toBe(true);
    expect(result.chainValid).toBe(true);
  });

  it('rejects tampered roundHash', () => {
    const proof = proofFor(commit0, 'round-1');
    proof.roundHash = 'deadbeef'.repeat(8);

    const result = verifyRound(proof);
    expect(result.valid).toBe(false);
    expect(result.chainValid).toBe(false);
    expect(result.reason).toContain('roundHash');
  });

  it('rejects tampered crashPoint', () => {
    const proof = proofFor(commit0, 'round-1');
    proof.crashPoint = '99.99';

    const result = verifyRound(proof, { nextRoundSeed: commit1.roundSeed });
    expect(result.valid).toBe(false);
    expect(result.crashValid).toBe(false);
  });

  it('rejects broken chain when nextRoundSeed does not match nextRoundHash', () => {
    const proof = proofFor(commit0, 'round-1');
    const result = verifyRound(proof, { nextRoundSeed: 'wrong-next-seed' });

    expect(result.valid).toBe(false);
    expect(result.crashValid).toBe(true);
    expect(result.chainValid).toBe(false);
    expect(result.reason).toContain('nextRoundSeed');
  });

  it('verifies chain via nextRoundCommittedHash', () => {
    const proof = proofFor(commit0, 'round-1');
    const result = verifyRound(proof, {
      nextRoundCommittedHash: commit1.roundHash,
    });

    expect(result.valid).toBe(true);
    expect(result.chainValid).toBe(true);
  });

  it('rejects when nextRoundCommittedHash breaks chain link', () => {
    const proof = proofFor(commit0, 'round-1');
    const result = verifyRound(proof, {
      nextRoundCommittedHash: hashRoundSeed('tampered'),
    });

    expect(result.valid).toBe(false);
    expect(result.chainValid).toBe(false);
  });
});

describe('Round integration with computeCrashPoint', () => {
  it('crashes at provably fair multiplier', () => {
    const chain = SeedChain.fromSeeds([FIXED_ROUND_SEED, 'next-seed']);
    const commit = chain.commit();
    const crashMultiplier = computeCrashPoint({
      roundSeed: commit.roundSeed,
      nonce: 1,
    });

    const round = Round.create({ roundId: 'round-pf' });
    round.placeBet({
      betId: 'bet-1',
      playerId: 'player-1',
      amountCents: 100n,
    });
    round.startRunning();
    round.crash({ crashMultiplier });

    expect(round.status).toBe(RoundStatus.CRASHED);
    expect(round.crashMultiplier?.toDecimalString()).toBe(
      crashMultiplier.toDecimalString(),
    );
  });
});
