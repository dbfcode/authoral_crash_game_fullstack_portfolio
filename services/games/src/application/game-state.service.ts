import { Inject, Injectable } from '@nestjs/common';
import { SeedChain } from '../domain/provably-fair';
import { CHAIN_STATE_REPOSITORY } from '../infrastructure/persistence/persistence.constants';
import type { ChainStateRepository } from './ports/chain-state.repository';

const DEFAULT_CHAIN_SIZE = 10_000;

@Injectable()
export class GameStateService {
  private seedChain: SeedChain | null = null;
  private initialized = false;

  constructor(
    @Inject(CHAIN_STATE_REPOSITORY)
    private readonly chainStateRepository: ChainStateRepository,
  ) {}

  async initialize(): Promise<SeedChain> {
    if (this.seedChain) {
      return this.seedChain;
    }

    const stored = await this.chainStateRepository.load();
    if (stored) {
      this.seedChain = SeedChain.fromSeeds(stored.seeds, stored.currentIndex);
    } else {
      this.seedChain = SeedChain.generate(DEFAULT_CHAIN_SIZE);
      await this.persistChain();
    }

    this.initialized = true;
    return this.seedChain;
  }

  getChain(): SeedChain {
    if (!this.seedChain) {
      throw new Error('GameStateService not initialized');
    }
    return this.seedChain;
  }

  getChainIndex(): number {
    return this.getChain().currentIndex;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async persistChain(): Promise<void> {
    const snapshot = this.getChain().exportSnapshot();
    await this.chainStateRepository.save({
      seeds: [...snapshot.seeds],
      currentIndex: snapshot.currentIndex,
    });
  }

  async advanceChain(): Promise<void> {
    this.getChain().advance();
    await this.persistChain();
  }
}
