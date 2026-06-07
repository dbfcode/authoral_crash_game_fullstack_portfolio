import { describe, expect, it } from 'bun:test';
import {
  computePayoutCents,
  formatCents,
  parseMoneyInputToCents,
} from '../../src/utils/money';

describe('money utils', () => {
  it('parses BRL input to cents', () => {
    expect(parseMoneyInputToCents('10.50')).toBe(1050n);
    expect(parseMoneyInputToCents('1')).toBe(100n);
  });

  it('formats cents without float', () => {
    expect(formatCents(1050n)).toContain('10,50');
  });

  it('computes payout in integer cents', () => {
    expect(computePayoutCents(1000n, '2.50')).toBe(2500n);
  });
});
