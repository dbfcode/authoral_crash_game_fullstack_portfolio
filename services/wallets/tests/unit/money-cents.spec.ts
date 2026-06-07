import { describe, expect, it } from 'bun:test';
import { InvalidAmountError } from '../../src/domain/errors';
import { MoneyCents } from '../../src/domain/money-cents';

describe('MoneyCents', () => {
  it('accepts positive bigint cents', () => {
    const money = MoneyCents.of(100n);
    expect(money.amount).toBe(100n);
  });

  it('rejects zero', () => {
    expect(() => MoneyCents.of(0n)).toThrow(InvalidAmountError);
  });

  it('rejects negative bigint', () => {
    expect(() => MoneyCents.of(-50n)).toThrow(InvalidAmountError);
  });

  it('rejects number with decimals', () => {
    expect(() => MoneyCents.of(10.5)).toThrow(InvalidAmountError);
  });

  it('rejects non-integer number', () => {
    expect(() => MoneyCents.of(10.99)).toThrow(InvalidAmountError);
  });
});
