import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { GameCommandService } from './application/game-command.service';
import { GameMessagingBootstrap } from './application/game-messaging.bootstrap';
import { GameQueryService } from './application/game-query.service';
import { GameStateService } from './application/game-state.service';
import { GameEventHandlers } from './application/handlers/game-event.handlers';
import { RoundBootstrapService } from './application/round-bootstrap.service';
import { RoundEngineService } from './application/round-engine.service';
import { RoundLockService } from './application/round-lock.service';
import { BetsController } from './presentation/bets.controller';
import { HealthController } from './presentation/health.controller';
import { RoundsController } from './presentation/rounds.controller';
import { PlayerAuthGuard } from './presentation/auth/player-auth.guard';
import { NoopGameEventPublisher } from './infrastructure/messaging/noop-game-event.publisher';
import { RabbitGameEventPublisher } from './infrastructure/messaging/rabbit-game-event.publisher';
import { EventPublisher } from './infrastructure/messaging/event.publisher';
import { RabbitMqConnection } from './infrastructure/messaging/rabbitmq.connection';
import {
  GAME_EVENT_PUBLISHER,
  RABBITMQ_CONNECTION,
} from './infrastructure/messaging/messaging.constants';
import { InMemoryBetRepository } from './infrastructure/persistence/in-memory-bet.repository';
import { InMemoryChainStateRepository } from './infrastructure/persistence/in-memory-chain-state.repository';
import { InMemoryRoundRepository } from './infrastructure/persistence/in-memory-round.repository';
import { PostgresBetRepository } from './infrastructure/persistence/postgres-bet.repository';
import { PostgresChainStateRepository } from './infrastructure/persistence/postgres-chain-state.repository';
import { PostgresRoundRepository } from './infrastructure/persistence/postgres-round.repository';
import {
  BET_REPOSITORY,
  CHAIN_STATE_REPOSITORY,
  PG_POOL,
  ROUND_REPOSITORY,
} from './infrastructure/persistence/persistence.constants';
import { runGameMigrations } from './infrastructure/persistence/run-migrations';

const useInMemoryPersistence = process.env.GAMES_USE_IN_MEMORY === '1';

const persistenceProviders = useInMemoryPersistence
  ? [
      {
        provide: CHAIN_STATE_REPOSITORY,
        useClass: InMemoryChainStateRepository,
      },
      {
        provide: ROUND_REPOSITORY,
        useFactory: () => new InMemoryRoundRepository(),
      },
      {
        provide: BET_REPOSITORY,
        useFactory: (rounds: InMemoryRoundRepository) =>
          new InMemoryBetRepository(rounds),
        inject: [ROUND_REPOSITORY],
      },
      {
        provide: GAME_EVENT_PUBLISHER,
        useClass: NoopGameEventPublisher,
      },
    ]
  : [
      {
        provide: PG_POOL,
        useFactory: async (): Promise<Pool> => {
          const connectionString =
            process.env.GAMES_DB_URL ??
            'postgresql://crash:crash@localhost:5432/games';
          const pool = new Pool({ connectionString });
          await runGameMigrations(pool);
          return pool;
        },
      },
      {
        provide: CHAIN_STATE_REPOSITORY,
        useFactory: (pool: Pool) => new PostgresChainStateRepository(pool),
        inject: [PG_POOL],
      },
      {
        provide: ROUND_REPOSITORY,
        useFactory: (pool: Pool) => new PostgresRoundRepository(pool),
        inject: [PG_POOL],
      },
      {
        provide: BET_REPOSITORY,
        useFactory: (pool: Pool) => new PostgresBetRepository(pool),
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
        provide: GAME_EVENT_PUBLISHER,
        useFactory: async (rabbit: RabbitMqConnection) => {
          const channel = await rabbit.connect();
          return new RabbitGameEventPublisher(new EventPublisher(channel));
        },
        inject: [RABBITMQ_CONNECTION],
      },
      GameEventHandlers,
      GameMessagingBootstrap,
    ];

@Module({
  controllers: [HealthController, RoundsController, BetsController],
  providers: [
    GameStateService,
    GameQueryService,
    GameCommandService,
    RoundBootstrapService,
    RoundEngineService,
    RoundLockService,
    PlayerAuthGuard,
    ...persistenceProviders,
  ],
  exports: [GameQueryService, GameCommandService, ROUND_REPOSITORY],
})
export class AppModule {}
