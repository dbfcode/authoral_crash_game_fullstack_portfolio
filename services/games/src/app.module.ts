import { Module } from '@nestjs/common';
import { GameMessagingBootstrap } from './application/game-messaging.bootstrap';
import { GameEventHandlers } from './application/handlers/game-event.handlers';
import { HealthController } from './presentation/health.controller';
import { RabbitMqConnection } from './infrastructure/messaging/rabbitmq.connection';
import { RABBITMQ_CONNECTION } from './infrastructure/messaging/messaging.constants';

@Module({
  controllers: [HealthController],
  providers: [
    GameEventHandlers,
    {
      provide: RABBITMQ_CONNECTION,
      useFactory: () =>
        new RabbitMqConnection(
          process.env.RABBITMQ_URL ?? 'amqp://crash:crash@localhost:5672',
        ),
    },
    GameMessagingBootstrap,
  ],
  exports: [GameEventHandlers, RABBITMQ_CONNECTION],
})
export class AppModule {}
