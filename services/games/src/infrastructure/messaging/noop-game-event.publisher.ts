import type { GameEventPublisher } from '../../application/ports/game-event.publisher';

export class NoopGameEventPublisher implements GameEventPublisher {
  async publishBetPlacedRequested(): Promise<void> {}

  async publishCashoutRequested(): Promise<void> {}
}
