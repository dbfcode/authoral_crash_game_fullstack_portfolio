import { describe, expect, it } from 'bun:test';
import { InvalidMultiplierError } from '../../src/domain/errors';
import { Multiplier } from '../../src/domain/multiplier';

describe('Multiplier', () => {
  it('represents 1.00x as 100 hundredths', () => {
    const multiplier = Multiplier.ofHundredths(100);
    expect(multiplier.toDecimalString()).toBe('1.00');
  });

  it('parses decimal string', () => {
    const multiplier = Multiplier.fromDecimalString('2.50');
    expect(multiplier.hundredths).toBe(250n);
    expect(multiplier.toDecimalString()).toBe('2.50');
  });

  it('rejects multiplier below 1.00x', () => {
    expect(() => Multiplier.ofHundredths(99)).toThrow(InvalidMultiplierError);
  });

  it('calculates payout without float', () => {
    const multiplier = Multiplier.fromDecimalString('2.00');
    expect(multiplier.calculatePayout(500n)).toBe(1000n);
  });

  it('calculates payout at 1.00x', () => {
    const multiplier = Multiplier.ofHundredths(100);
    expect(multiplier.calculatePayout(250n)).toBe(250n);
  });
});
