import { Channel } from 'amqplib';
import {
  createEnvelope,
  EventEnvelope,
  EventType,
  EXCHANGE_NAME,
  getRoutingKey,
  serializeEnvelope,
} from '@crash/shared';

export class EventPublisher {
  constructor(private readonly channel: Channel) {}

  async publish<TType extends EventType, TPayload>(
    type: TType,
    payload: TPayload,
    options: { correlationId: string; eventId?: string },
  ): Promise<EventEnvelope<TType, TPayload>> {
    const envelope = createEnvelope(type, payload, {
      correlationId: options.correlationId,
      eventId: options.eventId,
    });

    this.channel.publish(
      EXCHANGE_NAME,
      getRoutingKey(type),
      Buffer.from(serializeEnvelope(envelope)),
      { persistent: true, contentType: 'application/json' },
    );

    return envelope;
  }
}
