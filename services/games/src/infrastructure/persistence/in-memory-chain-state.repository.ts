import {
  ChainStateRepository,
  ChainStateSnapshot,
} from '../../application/ports/chain-state.repository';

export class InMemoryChainStateRepository implements ChainStateRepository {
  private snapshot: ChainStateSnapshot | null = null;

  async load(): Promise<ChainStateSnapshot | null> {
    return this.snapshot;
  }

  async save(snapshot: ChainStateSnapshot): Promise<void> {
    this.snapshot = snapshot;
  }
}
