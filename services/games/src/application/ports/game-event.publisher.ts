import {
  BetPlacedRequestedPayload,
  CashoutRequestedPayload,
} from '@crash/shared';

export interface GameEventPublisher {
  publishBetPlacedRequested(
    payload: BetPlacedRequestedPayload,
    correlationId: string,
  ): Promise<void>;

  publishCashoutRequested(
    payload: CashoutRequestedPayload,
    correlationId: string,
  ): Promise<void>;
}
