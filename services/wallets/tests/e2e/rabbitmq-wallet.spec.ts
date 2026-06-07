import { describe, expect, it } from 'bun:test';
import amqp from 'amqplib';
import {
  BetPlacedRequestedPayload,
  createEnvelope,
  EventTypes,
  EXCHANGE_NAME,
  getRoutingKey,
  serializeEnvelope,
  WALLET_QUEUE,
} from '@crash/shared';
import { WalletEventHandlers } from '../../src/application/handlers/wallet-event.handlers';
import { WalletService } from '../../src/application/wallet.service';
import { EventPublisher } from '../../src/infrastructure/messaging/event.publisher';
import { RabbitMqConnection } from '../../src/infrastructure/messaging/rabbitmq.connection';
import { WalletEventConsumer } from '../../src/infrastructure/messaging/wallet-event.consumer';
import { InMemoryProcessedEventRepository } from '../../src/infrastructure/persistence/in-memory-processed-event.repository';
import { InMemoryWalletRepository } from '../../src/infrastructure/persistence/in-memory-wallet.repository';

const rabbitUrl = process.env.RABBITMQ_URL ?? 'amqp://crash:crash@localhost:5672';

describe('RabbitMQ wallet integration', () => {
  it('processes BetPlacedRequested and publishes BetReserved', async () => {
    if (process.env.SKIP_RABBITMQ_E2E === '1') {
      return;
    }

    let connection;
    try {
      connection = await amqp.connect(rabbitUrl);
    } catch {
      console.warn('RabbitMQ unavailable — skipping e2e broker test');
      return;
    }

    const rabbitMq = new RabbitMqConnection(rabbitUrl);
    const channel = await rabbitMq.setupWalletConsumer();
    await rabbitMq.setupGameConsumer();

    const repository = new InMemoryWalletRepository();
    const service = new WalletService(repository);
    await service.createWallet('player-1', 1000n);
    const handlers = new WalletEventHandlers(service);
    const publisher = new EventPublisher(channel);
    const consumer = new WalletEventConsumer(
      channel,
      handlers,
      publisher,
      new InMemoryProcessedEventRepository(),
    );
    await consumer.start();

    const responsePromise = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('timeout waiting response')), 5000);
      void channel.consume(
        'game-service.events',
        (message) => {
          if (!message) return;
          clearTimeout(timeout);
          channel.ack(message);
          resolve(message.content.toString());
        },
        { noAck: false },
      );
    });

    const envelope = createEnvelope(
      EventTypes.BET_PLACED_REQUESTED,
      {
        playerId: 'player-1',
        amountCents: '200',
        betId: 'bet-e2e-1',
        roundId: 'round-e2e-1',
      } satisfies BetPlacedRequestedPayload,
      { correlationId: 'bet-e2e-1' },
    );

    channel.publish(
      EXCHANGE_NAME,
      getRoutingKey(EventTypes.BET_PLACED_REQUESTED),
      Buffer.from(serializeEnvelope(envelope)),
    );

    const raw = await responsePromise;
    const response = JSON.parse(raw) as { type: string };
    expect(response.type).toBe(EventTypes.BET_RESERVED);

    await rabbitMq.close();
    await connection.close();
  });
});
