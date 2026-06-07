import { Injectable } from '@nestjs/common';
import { SeedChain } from '../domain/provably-fair';

@Injectable()
export class GameStateService {
  private seedChain: SeedChain | null = null;
  private chainIndex = 0;

  getOrCreateChain(): SeedChain {
    if (!this.seedChain) {
      this.seedChain = SeedChain.generate(10_000);
      this.chainIndex = 0;
    }
    return this.seedChain;
  }

  getChainIndex(): number {
    return this.chainIndex;
  }

  setChainIndex(index: number): void {
    this.chainIndex = index;
  }
}
