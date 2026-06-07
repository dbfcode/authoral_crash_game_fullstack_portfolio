import { Injectable, OnModuleDestroy, OnModuleInit, Inject } from '@nestjs/common';
import { WalletEventHandlers } from './handlers/wallet-event.handlers';
import { ProcessedEventRepository } from './ports/processed-event.repository';
import { EventPublisher } from '../infrastructure/messaging/event.publisher';
import { RabbitMqConnection } from '../infrastructure/messaging/rabbitmq.connection';
import { WalletEventConsumer } from '../infrastructure/messaging/wallet-event.consumer';
import { RABBITMQ_CONNECTION } from '../infrastructure/messaging/messaging.constants';
import { PROCESSED_EVENT_REPOSITORY } from '../infrastructure/messaging/messaging.constants';

@Injectable()
export class WalletMessagingBootstrap implements OnModuleInit, OnModuleDestroy {
  private consumer: WalletEventConsumer | null = null;

  constructor(
    @Inject(RABBITMQ_CONNECTION) private readonly rabbitMq: RabbitMqConnection,
    private readonly handlers: WalletEventHandlers,
    @Inject(PROCESSED_EVENT_REPOSITORY)
    private readonly processedEvents: ProcessedEventRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    const channel = await this.rabbitMq.setupWalletConsumer();
    const publisher = new EventPublisher(channel);
    this.consumer = new WalletEventConsumer(
      channel,
      this.handlers,
      publisher,
      this.processedEvents,
    );
    await this.consumer.start();
  }

  async onModuleDestroy(): Promise<void> {
    await this.rabbitMq.close();
  }
}
