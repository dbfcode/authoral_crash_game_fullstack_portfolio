import { describe, expect, it } from 'bun:test';
import { Multiplier } from '../../src/domain/multiplier';
import {
  hasReachedCrashPoint,
  nextMultiplier,
} from '../../src/domain/multiplier-growth';

describe('multiplier-growth', () => {
  it('increments multiplier by step', () => {
    const current = Multiplier.ofHundredths(100n);
    const next = nextMultiplier(current, 5n);
    expect(next.toDecimalString()).toBe('1.05');
  });

  it('detects crash point reached', () => {
    const current = Multiplier.fromDecimalString('2.00');
    const crash = Multiplier.fromDecimalString('2.00');
    expect(hasReachedCrashPoint(current, crash)).toBe(true);
  });

  it('detects crash point not yet reached', () => {
    const current = Multiplier.fromDecimalString('1.95');
    const crash = Multiplier.fromDecimalString('2.00');
    expect(hasReachedCrashPoint(current, crash)).toBe(false);
  });
});
