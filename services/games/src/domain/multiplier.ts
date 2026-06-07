import { InvalidMultiplierError } from './errors';

/** Multiplier stored as hundredths: 100 = 1.00x, 250 = 2.50x */
export class Multiplier {
  private constructor(readonly hundredths: bigint) {}

  static ofHundredths(value: bigint | number): Multiplier {
    const hundredths = typeof value === 'number' ? BigInt(value) : value;
    if (hundredths < 100n) {
      throw new InvalidMultiplierError();
    }
    return new Multiplier(hundredths);
  }

  static fromDecimalString(value: string): Multiplier {
    const match = /^(\d+)\.(\d{1,2})$/.exec(value);
    if (!match) {
      throw new InvalidMultiplierError();
    }
    const whole = BigInt(match[1]!);
    const fraction = match[2]!.padEnd(2, '0');
    const hundredths = whole * 100n + BigInt(fraction);
    return Multiplier.ofHundredths(hundredths);
  }

  toDecimalString(): string {
    const whole = this.hundredths / 100n;
    const fraction = (this.hundredths % 100n).toString().padStart(2, '0');
    return `${whole}.${fraction}`;
  }

  calculatePayout(amountCents: bigint): bigint {
    return (amountCents * this.hundredths) / 100n;
  }
}
