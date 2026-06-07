import { Channel, ConsumeMessage } from 'amqplib';
import {
  BetRejectedPayload,
  BetReservedPayload,
  CashoutPaidPayload,
  CashoutRejectedPayload,
  EventTypes,
  parseEnvelope,
} from '@crash/shared';
import { GameEventHandlerService } from '../../application/handlers/game-event-handler.service';
import { ProcessedEventRepository } from '../../application/ports/processed-event.repository';

export class GameEventConsumer {
  constructor(
    private readonly channel: Channel,
    private readonly handlers: GameEventHandlerService,
    private readonly processedEvents: ProcessedEventRepository,
  ) {}

  async start(): Promise<void> {
    await this.channel.consume('game-service.events', (message) => {
      void this.handleMessage(message);
    });
  }

  async handleMessage(message: ConsumeMessage | null): Promise<void> {
    if (!message) {
      return;
    }

    try {
      const envelope = parseEnvelope(message.content.toString());

      if (await this.processedEvents.exists(envelope.eventId)) {
        this.channel.ack(message);
        return;
      }

      switch (envelope.type) {
        case EventTypes.BET_RESERVED:
          await this.handlers.handleBetReserved(
            envelope.payload as BetReservedPayload,
          );
          break;
        case EventTypes.BET_REJECTED:
          await this.handlers.handleBetRejected(
            envelope.payload as BetRejectedPayload,
          );
          break;
        case EventTypes.CASHOUT_PAID:
          await this.handlers.handleCashoutPaid(
            envelope.payload as CashoutPaidPayload,
          );
          break;
        case EventTypes.CASHOUT_REJECTED:
          await this.handlers.handleCashoutRejected(
            envelope.payload as CashoutRejectedPayload,
          );
          break;
        default:
          this.channel.ack(message);
          return;
      }

      await this.processedEvents.markProcessed(envelope.eventId);
      this.channel.ack(message);
    } catch {
      this.channel.nack(message, false, false);
    }
  }
}
