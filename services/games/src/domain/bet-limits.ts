import { BetLimitError } from './errors';

export const MIN_BET_CENTS = 100n;
export const MAX_BET_CENTS = 100_000n;

export function assertBetWithinLimits(amountCents: bigint): void {
  if (amountCents < MIN_BET_CENTS || amountCents > MAX_BET_CENTS) {
    throw new BetLimitError();
  }
}
