import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { WalletRepository } from './application/ports/wallet.repository';
import { WalletService } from './application/wallet.service';
import { HealthController } from './presentation/health.controller';
import { PostgresWalletRepository } from './infrastructure/persistence/postgres-wallet.repository';
import {
  PG_POOL,
  WALLET_REPOSITORY,
} from './infrastructure/persistence/persistence.constants';
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
      provide: WalletService,
      useFactory: (repository: WalletRepository) => new WalletService(repository),
      inject: [WALLET_REPOSITORY],
    },
  ],
  exports: [WalletService, WALLET_REPOSITORY],
})
export class AppModule {}
