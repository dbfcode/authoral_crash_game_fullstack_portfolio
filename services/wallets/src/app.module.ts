import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { WalletRepository } from './application/ports/wallet.repository';
import { WalletEventHandlers } from './application/handlers/wallet-event.handlers';
import { WalletService } from './application/wallet.service';
import { WalletMessagingBootstrap } from './application/wallet-messaging.bootstrap';
import { HealthController } from './presentation/health.controller';
import { PostgresWalletRepository } from './infrastructure/persistence/postgres-wallet.repository';
import { PostgresProcessedEventRepository } from './infrastructure/persistence/postgres-processed-event.repository';
import {
  PG_POOL,
  WALLET_REPOSITORY,
} from './infrastructure/persistence/persistence.constants';
import {
  PROCESSED_EVENT_REPOSITORY,
  RABBITMQ_CONNECTION,
} from './infrastructure/messaging/messaging.constants';
import { ProcessedEventRepository } from './application/ports/processed-event.repository';
import { RabbitMqConnection } from './infrastructure/messaging/rabbitmq.connection';
import { runWalletMigrations } from './infrastructure/persistence/run-migrations';

@Module({
  controllers: [HealthController],
  providers: [
    {
      provide: PG_POOL,
      useFactory: async (): Promise<Pool> => {
        const connectionString =
          process.env.WALLETS_DB_URL ??
          'postgresql://crash:crash@localhost:5432/wallets';
        const pool = new Pool({ connectionString });
        await runWalletMigrations(pool);
        return pool;
      },
    },
    {
      provide: WALLET_REPOSITORY,
      useFactory: (pool: Pool) => new PostgresWalletRepository(pool),
      inject: [PG_POOL],
    },
    {
      provide: PROCESSED_EVENT_REPOSITORY,
      useFactory: (pool: Pool) => new PostgresProcessedEventRepository(pool),
      inject: [PG_POOL],
    },
    {
      provide: RABBITMQ_CONNECTION,
      useFactory: () =>
        new RabbitMqConnection(
          process.env.RABBITMQ_URL ?? 'amqp://crash:crash@localhost:5672',
        ),
    },
    {
      provide: WalletService,
      useFactory: (repository: WalletRepository) => new WalletService(repository),
      inject: [WALLET_REPOSITORY],
    },
    {
      provide: WalletEventHandlers,
      useFactory: (walletService: WalletService) =>
        new WalletEventHandlers(walletService),
      inject: [WalletService],
    },
    WalletMessagingBootstrap,
  ],
  exports: [WalletService, WalletEventHandlers, WALLET_REPOSITORY, RABBITMQ_CONNECTION],
})
export class AppModule {}
