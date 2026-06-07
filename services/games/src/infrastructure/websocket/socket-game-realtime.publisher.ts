import { Injectable } from '@nestjs/common';
import { WsEventTypes } from '@crash/shared';
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
import type { GameRealtimePublisher } from '../../application/ports/game-realtime.publisher';
import { GameGateway } from '../../presentation/websocket/game.gateway';

@Injectable()
export class SocketGameRealtimePublisher implements GameRealtimePublisher {
  constructor(private readonly gateway: GameGateway) {}

  emitSnapshot(clientId: string, payload: RoundSnapshotPayload): void {
    this.gateway.emitToClient(clientId, WsEventTypes.ROUND_SNAPSHOT, payload);
  }

  broadcastBettingStarted(payload: RoundBettingStartedPayload): void {
    this.gateway.emitToAll(WsEventTypes.ROUND_BETTING_STARTED, payload);
  }

  broadcastRoundStarted(payload: RoundStartedPayload): void {
    this.gateway.emitToAll(WsEventTypes.ROUND_STARTED, payload);
  }

  broadcastTick(payload: RoundTickPayload): void {
    this.gateway.emitToAll(WsEventTypes.ROUND_TICK, payload);
  }

  broadcastCrashed(payload: RoundCrashedPayload): void {
    this.gateway.emitToAll(WsEventTypes.ROUND_CRASHED, payload);
  }

  broadcastSettled(payload: RoundSettledPayload): void {
    this.gateway.emitToAll(WsEventTypes.ROUND_SETTLED, payload);
  }

  broadcastHistoryUpdated(payload: RoundHistoryUpdatedPayload): void {
    this.gateway.emitToAll(WsEventTypes.ROUND_HISTORY_UPDATED, payload);
  }

  broadcastBetPlaced(payload: BetPlacedWsPayload): void {
    this.gateway.emitToAll(WsEventTypes.BET_PLACED, payload);
  }

  broadcastBetCashout(payload: BetCashoutWsPayload): void {
    this.gateway.emitToAll(WsEventTypes.BET_CASHOUT, payload);
  }

  broadcastBetRemoved(payload: BetRemovedWsPayload): void {
    this.gateway.emitToAll(WsEventTypes.BET_REMOVED, payload);
  }
}
