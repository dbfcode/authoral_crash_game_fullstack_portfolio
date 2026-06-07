import { Channel, ConsumeMessage } from 'amqplib';
import {
  BetPlacedRequestedPayload,
  CashoutRequestedPayload,
  EventTypes,
  parseEnvelope,
  WALLET_QUEUE,
} from '@crash/shared';
import { WalletEventHandlers } from '../../application/handlers/wallet-event.handlers';
import { ProcessedEventRepository } from '../../application/ports/processed-event.repository';
import { EventPublisher } from './event.publisher';

export class WalletEventConsumer {
  constructor(
    private readonly channel: Channel,
    private readonly handlers: WalletEventHandlers,
    private readonly publisher: EventPublisher,
    private readonly processedEvents: ProcessedEventRepository,
  ) {}

  async start(): Promise<void> {
    await this.channel.consume(WALLET_QUEUE, (message) => {
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

      let result;
      switch (envelope.type) {
        case EventTypes.BET_PLACED_REQUESTED:
          result = await this.handlers.handleBetPlacedRequested(
            envelope.payload as BetPlacedRequestedPayload,
          );
          break;
        case EventTypes.CASHOUT_REQUESTED:
          result = await this.handlers.handleCashoutRequested(
            envelope.payload as CashoutRequestedPayload,
          );
          break;
        default:
          this.channel.ack(message);
          return;
      }

      await this.publisher.publish(result.type, result.payload, {
        correlationId: envelope.correlationId,
      });

      await this.processedEvents.markProcessed(envelope.eventId);
      this.channel.ack(message);
    } catch {
      this.channel.nack(message, false, false);
    }
  }
}
