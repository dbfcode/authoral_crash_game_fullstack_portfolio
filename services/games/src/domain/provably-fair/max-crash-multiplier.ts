import { Multiplier } from '../multiplier';

/** Default 100.00x — keeps rounds playable; uncapped PF can reach 10k+. */
const DEFAULT_MAX = '100.00';

export function maxCrashMultiplier(): Multiplier {
  const raw = process.env.GAMES_MAX_CRASH_MULTIPLIER ?? DEFAULT_MAX;
  try {
    return Multiplier.fromDecimalString(raw);
  } catch {
    return Multiplier.fromDecimalString(DEFAULT_MAX);
  }
}

export function capCrashHundredths(hundredths: bigint): bigint {
  const max = maxCrashMultiplier().hundredths;
  return hundredths > max ? max : hundredths;
}
