import { InvalidAmountError } from './errors';

export class MoneyCents {
  private constructor(readonly amount: bigint) {}

  static of(value: bigint | number): MoneyCents {
    if (typeof value === 'number') {
      if (!Number.isInteger(value) || value <= 0) {
        throw new InvalidAmountError();
      }
      return new MoneyCents(BigInt(value));
    }

    if (value <= 0n) {
      throw new InvalidAmountError();
    }

    return new MoneyCents(value);
  }
}
