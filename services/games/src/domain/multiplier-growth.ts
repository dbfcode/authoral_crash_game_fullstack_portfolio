import { Multiplier } from './multiplier';

export function nextMultiplier(
  current: Multiplier,
  stepHundredths: bigint,
): Multiplier {
  return Multiplier.ofHundredths(current.hundredths + stepHundredths);
}

export function hasReachedCrashPoint(
  current: Multiplier,
  crashPoint: Multiplier,
): boolean {
  return current.hundredths >= crashPoint.hundredths;
}
