import { randomBytes } from 'crypto';
import { hashRoundSeed } from './hash-round-seed';

export type ChainCommit = {
  index: number;
  roundSeed: string;
  roundHash: string;
  nextRoundHash: string | null;
};

export class SeedChain {
  private constructor(
    private readonly seeds: readonly string[],
    private _currentIndex: number,
  ) {}

  static generate(count: number): SeedChain {
    if (count < 1) {
      throw new Error('SeedChain count must be at least 1');
    }

    const seeds = Array.from({ length: count }, () =>
      randomBytes(32).toString('hex'),
    );
    return new SeedChain(seeds, 0);
  }

  static fromSeeds(seeds: readonly string[], startIndex = 0): SeedChain {
    if (seeds.length === 0) {
      throw new Error('SeedChain requires at least one seed');
    }
    if (startIndex < 0 || startIndex >= seeds.length) {
      throw new Error('SeedChain startIndex out of bounds');
    }
    return new SeedChain(seeds, startIndex);
  }

  get seedsCount(): number {
    return this.seeds.length;
  }

  get currentIndex(): number {
    return this._currentIndex;
  }

  commit(index?: number): ChainCommit {
    const i = index ?? this._currentIndex;
    const roundSeed = this.seeds[i];
    if (roundSeed === undefined) {
      throw new Error(`SeedChain index ${i} out of bounds`);
    }

    const nextSeed = this.seeds[i + 1];
    return {
      index: i,
      roundSeed,
      roundHash: hashRoundSeed(roundSeed),
      nextRoundHash: nextSeed !== undefined ? hashRoundSeed(nextSeed) : null,
    };
  }

  advance(): ChainCommit {
    if (this._currentIndex >= this.seeds.length - 1) {
      throw new Error('SeedChain exhausted');
    }
    this._currentIndex += 1;
    return this.commit();
  }

  exportSnapshot(): { seeds: readonly string[]; currentIndex: number } {
    return { seeds: this.seeds, currentIndex: this._currentIndex };
  }
}
