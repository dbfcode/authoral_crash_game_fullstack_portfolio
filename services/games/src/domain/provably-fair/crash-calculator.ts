import { createHmac } from 'crypto';
import { Multiplier } from '../multiplier';
import { capCrashHundredths } from './max-crash-multiplier';

export type ComputeCrashPointInput = {
  roundSeed: string;
  nonce: number | string;
  clientSeed?: string;
};

/** ~3% instant 1.00x via h % 33 === 0 (Bustabit-style house edge). */
const INSTANT_CRASH_MODULO = 33;

/**
 * Derives crash multiplier from HMAC-SHA256(roundSeed, `${clientSeed}:${nonce}`).
 * Returns hundredths-compatible Multiplier (100 = 1.00x).
 */
export function computeCrashPoint(input: ComputeCrashPointInput): Multiplier {
  const clientSeed = input.clientSeed ?? '';
  const message = `${clientSeed}:${String(input.nonce)}`;
  const digest = createHmac('sha256', input.roundSeed)
    .update(message, 'utf8')
    .digest('hex');

  const h = parseInt(digest.slice(0, 13), 16);
  const e = 2 ** 52;

  if (h % INSTANT_CRASH_MODULO === 0) {
    return Multiplier.ofHundredths(100);
  }

  const hundredths = capCrashHundredths(
    BigInt(Math.floor((100 * e - h) / (e - h))),
  );
  return Multiplier.ofHundredths(hundredths);
}
