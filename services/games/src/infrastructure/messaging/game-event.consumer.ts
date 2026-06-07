import { Channel, ConsumeMessage } from 'amqplib';
import { EventTypes, GAME_QUEUE, parseEnvelope } from '@crash/shared';
import { GameEventHandlers } from '../../application/handlers/game-event.handlers';

export class GameEventConsumer {
  constructor(
    private readonly channel: Channel,
    private readonly handlers: GameEventHandlers,
  ) {}

  async start(): Promise<void> {
    await this.channel.consume(GAME_QUEUE, (message) => {
      void this.handleMessage(message);
    });
  }

  async handleMessage(message: ConsumeMessage | null): Promise<void> {
    if (!message) {
      return;
    }

    try {
      const envelope = parseEnvelope(message.content.toString());
      switch (envelope.type) {
        case EventTypes.BET_RESERVED:
        case EventTypes.BET_REJECTED:
        case EventTypes.CASHOUT_PAID:
        case EventTypes.CASHOUT_REJECTED:
          this.handlers.handle(envelope.type, envelope);
          break;
        default:
          break;
      }
      this.channel.ack(message);
    } catch {
      this.channel.nack(message, false, false);
    }
  }
}
