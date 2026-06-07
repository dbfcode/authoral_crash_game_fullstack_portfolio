import { Injectable, OnModuleDestroy, OnModuleInit, Inject } from '@nestjs/common';
import { GameEventHandlerService } from './handlers/game-event-handler.service';
import { GameEventConsumer } from '../infrastructure/messaging/game-event.consumer';
import { RabbitMqConnection } from '../infrastructure/messaging/rabbitmq.connection';
import {
  RABBITMQ_CONNECTION,
} from '../infrastructure/messaging/messaging.constants';
import { PROCESSED_EVENT_REPOSITORY } from '../infrastructure/persistence/persistence.constants';
import type { ProcessedEventRepository } from './ports/processed-event.repository';

@Injectable()
export class GameMessagingBootstrap implements OnModuleInit, OnModuleDestroy {
  private consumer: GameEventConsumer | null = null;

  constructor(
    @Inject(RABBITMQ_CONNECTION) private readonly rabbitMq: RabbitMqConnection,
    private readonly handlers: GameEventHandlerService,
    @Inject(PROCESSED_EVENT_REPOSITORY)
    private readonly processedEvents: ProcessedEventRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    const channel = await this.rabbitMq.setupGameConsumer();
    this.consumer = new GameEventConsumer(
      channel,
      this.handlers,
      this.processedEvents,
    );
    await this.consumer.start();
  }

  async onModuleDestroy(): Promise<void> {
    await this.rabbitMq.close();
  }
}
