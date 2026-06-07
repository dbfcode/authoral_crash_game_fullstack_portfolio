import { Injectable, OnModuleDestroy, OnModuleInit, Inject } from '@nestjs/common';
import { GameEventHandlers } from './handlers/game-event.handlers';
import { GameEventConsumer } from '../infrastructure/messaging/game-event.consumer';
import { RabbitMqConnection } from '../infrastructure/messaging/rabbitmq.connection';
import { RABBITMQ_CONNECTION } from '../infrastructure/messaging/messaging.constants';

@Injectable()
export class GameMessagingBootstrap implements OnModuleInit, OnModuleDestroy {
  private consumer: GameEventConsumer | null = null;

  constructor(
    @Inject(RABBITMQ_CONNECTION) private readonly rabbitMq: RabbitMqConnection,
    private readonly handlers: GameEventHandlers,
  ) {}

  async onModuleInit(): Promise<void> {
    const channel = await this.rabbitMq.setupGameConsumer();
    this.consumer = new GameEventConsumer(channel, this.handlers);
    await this.consumer.start();
  }

  async onModuleDestroy(): Promise<void> {
    await this.rabbitMq.close();
  }
}
