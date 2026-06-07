import type { GameRealtimePublisher } from '../../application/ports/game-realtime.publisher';

export class NoopGameRealtimePublisher implements GameRealtimePublisher {
  emitSnapshot(): void {}
  broadcastBettingStarted(): void {}
  broadcastRoundStarted(): void {}
  broadcastTick(): void {}
  broadcastCrashed(): void {}
  broadcastSettled(): void {}
  broadcastHistoryUpdated(): void {}
  broadcastBetPlaced(): void {}
  broadcastBetCashout(): void {}
  broadcastBetRemoved(): void {}
}
