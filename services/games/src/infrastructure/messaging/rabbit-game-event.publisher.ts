import { EventTypes } from '@crash/shared';
import type { GameEventPublisher } from '../../application/ports/game-event.publisher';
import { EventPublisher } from './event.publisher';

export class RabbitGameEventPublisher implements GameEventPublisher {
  constructor(private readonly publisher: EventPublisher) {}

  async publishBetPlacedRequested(
    payload: Parameters<GameEventPublisher['publishBetPlacedRequested']>[0],
    correlationId: string,
  ): Promise<void> {
    await this.publisher.publish(EventTypes.BET_PLACED_REQUESTED, payload, {
      correlationId,
    });
  }

  async publishCashoutRequested(
    payload: Parameters<GameEventPublisher['publishCashoutRequested']>[0],
    correlationId: string,
  ): Promise<void> {
    await this.publisher.publish(EventTypes.CASHOUT_REQUESTED, payload, {
      correlationId,
    });
  }
}
