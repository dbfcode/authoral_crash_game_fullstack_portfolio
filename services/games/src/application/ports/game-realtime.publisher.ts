import type {
  BetCashoutWsPayload,
  BetPlacedWsPayload,
  BetRemovedWsPayload,
  RoundBettingStartedPayload,
  RoundCrashedPayload,
  RoundHistoryUpdatedPayload,
  RoundSettledPayload,
  RoundSnapshotPayload,
  RoundStartedPayload,
  RoundTickPayload,
} from '@crash/shared';

export interface GameRealtimePublisher {
  emitSnapshot(clientId: string, payload: RoundSnapshotPayload): void;
  broadcastBettingStarted(payload: RoundBettingStartedPayload): void;
  broadcastRoundStarted(payload: RoundStartedPayload): void;
  broadcastTick(payload: RoundTickPayload): void;
  broadcastCrashed(payload: RoundCrashedPayload): void;
  broadcastSettled(payload: RoundSettledPayload): void;
  broadcastHistoryUpdated(payload: RoundHistoryUpdatedPayload): void;
  broadcastBetPlaced(payload: BetPlacedWsPayload): void;
  broadcastBetCashout(payload: BetCashoutWsPayload): void;
  broadcastBetRemoved(payload: BetRemovedWsPayload): void;
}
