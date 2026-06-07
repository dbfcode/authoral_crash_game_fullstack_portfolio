import { describe, expect, it, beforeEach } from 'bun:test';
import { GameStateService } from '../../src/application/game-state.service';
import { InMemoryChainStateRepository } from '../../src/infrastructure/persistence/in-memory-chain-state.repository';
import { SeedChain } from '../../src/domain/provably-fair';

describe('GameStateService chain persistence', () => {
  let chainRepo: InMemoryChainStateRepository;
  let service: GameStateService;

  beforeEach(() => {
    chainRepo = new InMemoryChainStateRepository();
    service = new GameStateService(chainRepo);
  });

  it('persists and restores seed chain across initialize', async () => {
    await service.initialize();
    await service.advanceChain();

    const snapshot = service.getChain().exportSnapshot();
    expect(snapshot.currentIndex).toBe(1);

    const restoredService = new GameStateService(chainRepo);
    await restoredService.initialize();

    expect(restoredService.getChainIndex()).toBe(1);
    expect(restoredService.getChain().commit().roundHash).toBe(
      SeedChain.fromSeeds(snapshot.seeds, snapshot.currentIndex).commit().roundHash,
    );
  });
});
