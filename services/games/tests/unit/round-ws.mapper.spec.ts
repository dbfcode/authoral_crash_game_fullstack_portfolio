import { describe, expect, it } from 'bun:test';
import { Bet } from '../../src/domain/bet';
import { Multiplier } from '../../src/domain/multiplier';
import { Round } from '../../src/domain/round';
import { PROVABLY_FAIR_ALGORITHM_VERSION } from '../../src/domain/provably-fair';
import {
  toBettingStartedPayload,
  toRoundCrashedPayload,
  toRoundSettledPayload,
  toRoundStartedPayload,
  toRoundTickPayload,
} from '../../src/application/mappers/round-ws.mapper';
import { RoundRecord } from '../../src/application/models/round-record';

function sampleRecord(overrides: Partial<RoundRecord['fairness']> = {}): RoundRecord {
  return {
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
      ...overrides,
    },
    createdAt: new Date(),
  };
}

describe('round-ws.mapper', () => {
  it('betting-started exposes hash only', () => {
    const payload = toBettingStartedPayload(sampleRecord());
    expect(payload).toEqual({
      roundId: 'round-1',
      committedRoundHash: 'hash-abc',
    });
    expect(payload).not.toHaveProperty('revealedRoundSeed');
  });

  it('tick payload has multiplier without seed', () => {
    const payload = toRoundTickPayload(
      'round-1',
      Multiplier.fromDecimalString('1.50'),
    );
    expect(payload.currentMultiplier).toBe('1.50');
    expect(payload).not.toHaveProperty('revealedRoundSeed');
  });

  it('started payload uses current multiplier', () => {
    const record = sampleRecord({ currentMultiplierHundredths: 105n });
    record.round.startRunning();
    const payload = toRoundStartedPayload(record);
    expect(payload.currentMultiplier).toBe('1.05');
  });

  it('crashed payload includes crashPoint only', () => {
    const record = sampleRecord({ crashPoint: '2.50' });
    record.round.startRunning();
    record.round.crash({ crashMultiplier: Multiplier.fromDecimalString('2.50') });
    const payload = toRoundCrashedPayload(record);
    expect(payload.crashPoint).toBe('2.50');
    expect(payload).not.toHaveProperty('revealedRoundSeed');
  });

  it('settled payload reveals seed and chain link', () => {
    const record = sampleRecord({
      roundSeed: 'seed-revealed',
      crashPoint: '3.00',
      nextRoundHash: 'hash-next',
    });
    const payload = toRoundSettledPayload(record);
    expect(payload.revealedRoundSeed).toBe('seed-revealed');
    expect(payload.nextRoundHash).toBe('hash-next');
    expect(payload.crashPoint).toBe('3.00');
  });
});
