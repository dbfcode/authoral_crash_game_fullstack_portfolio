import { describe, expect, it } from 'bun:test';
import { BetLimitError } from '../../src/domain/errors';
import { assertBetWithinLimits, MAX_BET_CENTS, MIN_BET_CENTS } from '../../src/domain/bet-limits';

describe('bet limits', () => {
  it('accepts amount within limits', () => {
    expect(() => assertBetWithinLimits(MIN_BET_CENTS)).not.toThrow();
    expect(() => assertBetWithinLimits(MAX_BET_CENTS)).not.toThrow();
  });

  it('rejects amount below minimum', () => {
    expect(() => assertBetWithinLimits(MIN_BET_CENTS - 1n)).toThrow(BetLimitError);
  });

  it('rejects amount above maximum', () => {
    expect(() => assertBetWithinLimits(MAX_BET_CENTS + 1n)).toThrow(BetLimitError);
  });
});
