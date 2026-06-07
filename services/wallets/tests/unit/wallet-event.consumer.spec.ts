import { describe, expect, it, beforeEach } from 'bun:test';
import {
  BetPlacedRequestedPayload,
  createEnvelope,
  EventTypes,
  serializeEnvelope,
} from '@crash/shared';
import { WalletEventHandlers } from '../../src/application/handlers/wallet-event.handlers';
import { WalletService } from '../../src/application/wallet.service';
import { InMemoryProcessedEventRepository } from '../../src/infrastructure/persistence/in-memory-processed-event.repository';
import { InMemoryWalletRepository } from '../../src/infrastructure/persistence/in-memory-wallet.repository';
import { EventPublisher } from '../../src/infrastructure/messaging/event.publisher';
import { WalletEventConsumer } from '../../src/infrastructure/messaging/wallet-event.consumer';

describe('WalletEventConsumer', () => {
  let service: WalletService;
  let handlers: WalletEventHandlers;
  let consumer: WalletEventConsumer;
  let published: Array<{ type: string; correlationId: string }>;
  let acked: boolean;

  beforeEach(async () => {
    const repository = new InMemoryWalletRepository();
    service = new WalletService(repository);
    handlers = new WalletEventHandlers(service);
    await service.createWallet('player-1', 1000n);
    published = [];
    acked = false;

    const channel = {
      ack: () => {
        acked = true;
      },
      nack: () => {
        acked = false;
      },
    };

    const publisher = {
      publish: async (type: string, _payload: unknown, options: { correlationId: string }) => {
        published.push({ type, correlationId: options.correlationId });
        return createEnvelope(type as EventTypes, {});
      },
    } as unknown as EventPublisher;

    consumer = new WalletEventConsumer(
      channel as never,
      handlers,
      publisher,
      new InMemoryProcessedEventRepository(),
    );
  });

  it('processes BetPlacedRequested and publishes BetReserved', async () => {
    const envelope = createEnvelope(EventTypes.BET_PLACED_REQUESTED, {
      playerId: 'player-1',
      amountCents: '200',
      betId: 'bet-1',
      roundId: 'round-1',
    } satisfies BetPlacedRequestedPayload);

    await consumer.handleMessage({
      content: Buffer.from(serializeEnvelope(envelope)),
    } as never);

    expect(published[0]?.type).toBe(EventTypes.BET_RESERVED);
    expect(published[0]?.correlationId).toBe(envelope.correlationId);
    expect(acked).toBe(true);
    expect(await service.getBalance('player-1')).toBe(800n);
  });

  it('skips duplicate eventId', async () => {
    const processed = new InMemoryProcessedEventRepository();
    await processed.markProcessed('dup-evt');

    const channel = { ack: () => { acked = true; }, nack: () => {} };
    const publisher = { publish: async () => createEnvelope(EventTypes.BET_RESERVED, {}) } as unknown as EventPublisher;
    const duplicateConsumer = new WalletEventConsumer(
      channel as never,
      handlers,
      publisher,
      processed,
    );

    const envelope = createEnvelope(
      EventTypes.BET_PLACED_REQUESTED,
      {
        playerId: 'player-1',
        amountCents: '200',
        betId: 'bet-1',
        roundId: 'round-1',
      },
      { eventId: 'dup-evt' },
    );

    await duplicateConsumer.handleMessage({
      content: Buffer.from(serializeEnvelope(envelope)),
    } as never);

    expect(published).toHaveLength(0);
    expect(acked).toBe(true);
  });
});
