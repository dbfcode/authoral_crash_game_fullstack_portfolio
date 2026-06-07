import { createHash } from 'crypto';

export function hashRoundSeed(seed: string): string {
  return createHash('sha256').update(seed, 'utf8').digest('hex');
}
