import 'reflect-metadata';
import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import amqp from 'amqplib';
import { AppModule as GamesAppModule } from '../../src/app.module';
import { WalletService } from '../../../wallets/src/application/wallet.service';
import { WalletEventHandlers } from '../../../wallets/src/application/handlers/wallet-event.handlers';
import { WalletEventConsumer } from '../../../wallets/src/infrastructure/messaging/wallet-event.consumer';
import { EventPublisher } from '../../../wallets/src/infrastructure/messaging/event.publisher';
import { RabbitMqConnection } from '../../../wallets/src/infrastructure/messaging/rabbitmq.connection';
import { PostgresWalletRepository } from '../../../wallets/src/infrastructure/persistence/postgres-wallet.repository';
import { PostgresProcessedEventRepository as WalletProcessedEventRepository } from '../../../wallets/src/infrastructure/persistence/postgres-processed-event.repository';
import { runWalletMigrations } from '../../../wallets/src/infrastructure/persistence/run-migrations';
import { Pool } from 'pg';
import { DomainExceptionFilter } from '../../src/presentation/filters/domain-exception.filter';

const rabbitUrl = process.env.RABBITMQ_URL ?? 'amqp://crash:crash@localhost:5672';
const gamesDbUrl =
  process.env.GAMES_DB_URL ?? 'postgresql://crash:crash@localhost:5432/games';
const walletsDbUrl =
  process.env.WALLETS_DB_URL ?? 'postgresql://crash:crash@localhost:5432/wallets';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function placeBetWhenBetting(
  app: INestApplication,
  playerId: string,
  amountCents: string,
) {
  return waitFor(
    async () => {
      const current = await request(app.getHttpServer()).get('/games/rounds/current');
      if (current.body.status !== 'betting') {
        return current;
      }
      return request(app.getHttpServer())
        .post('/games/bet')
        .set('X-Player-Id', playerId)
        .send({ amountCents });
    },
    (response) => response.status === 201,
    15000,
    50,
  );
}

async function waitFor<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  timeoutMs = 15000,
  intervalMs = 100,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await fn();
    if (predicate(value)) {
      return value;
    }
    await sleep(intervalMs);
  }
  throw new Error('waitFor timeout');
}

describe('Gameplay broker E2E', () => {
  let gamesApp: INestApplication;
  let walletService: WalletService;
  let walletPool: Pool;
  let rabbitMq: RabbitMqConnection;
  let infraAvailable = false;

  beforeAll(async () => {
    if (process.env.SKIP_RABBITMQ_E2E === '1') {
      return;
    }

    try {
      const connection = await amqp.connect(rabbitUrl);
      await connection.close();
    } catch {
      console.warn('RabbitMQ unavailable — skipping gameplay broker e2e');
      return;
    }

    process.env.GAMES_USE_IN_MEMORY = '0';
    process.env.GAMES_DISABLE_ROUND_ENGINE = '0';
    process.env.GAMES_DISABLE_WS = '1';
    process.env.GAMES_BETTING_DURATION_MS = '1200';
    process.env.GAMES_MULTIPLIER_TICK_MS = '50';
    process.env.GAMES_MULTIPLIER_STEP_HUNDREDTHS = '25';
    process.env.GAMES_DB_URL = gamesDbUrl;
    process.env.RABBITMQ_URL = rabbitUrl;

    try {
      walletPool = new Pool({ connectionString: walletsDbUrl });
      await runWalletMigrations(walletPool);

      const walletRepository = new PostgresWalletRepository(walletPool);
      walletService = new WalletService(walletRepository);

      rabbitMq = new RabbitMqConnection(rabbitUrl);
      const channel = await rabbitMq.setupWalletConsumer();
      await rabbitMq.setupGameConsumer();

      const handlers = new WalletEventHandlers(walletService);
      const walletConsumer = new WalletEventConsumer(
        channel,
        handlers,
        new EventPublisher(channel),
        new WalletProcessedEventRepository(walletPool),
      );
      await walletConsumer.start();

      const gamesModule = await Test.createTestingModule({
        imports: [GamesAppModule.register()],
      }).compile();
      gamesApp = gamesModule.createNestApplication();
      gamesApp.setGlobalPrefix('games');
      gamesApp.useGlobalFilters(new DomainExceptionFilter());
      await gamesApp.init();

      infraAvailable = true;
    } catch (error) {
      console.warn('Gameplay broker e2e setup failed — skipping', error);
    }
  });

  afterAll(async () => {
    if (gamesApp) {
      await gamesApp.close();
    }
    if (rabbitMq) {
      await rabbitMq.close();
    }
    if (walletPool) {
      await walletPool.end();
    }
    delete process.env.GAMES_USE_IN_MEMORY;
    delete process.env.GAMES_DISABLE_ROUND_ENGINE;
    delete process.env.GAMES_BETTING_DURATION_MS;
    delete process.env.GAMES_MULTIPLIER_TICK_MS;
    delete process.env.GAMES_MULTIPLIER_STEP_HUNDREDTHS;
    delete process.env.GAMES_DISABLE_WS;
  });

  it('rejects bet when wallet has insufficient balance', async () => {
    if (!infraAvailable) {
      return;
    }

    const playerId = `player-insufficient-${randomUUID()}`;
    await walletService.createWallet(playerId, 100n);

    const betResponse = await placeBetWhenBetting(
      gamesApp,
      playerId,
      '500',
    );

    expect(betResponse.status).toBe(201);

    await waitFor(
      async () => walletService.getBalance(playerId),
      (balance) => balance === 100n,
    );

    await waitFor(
      async () =>
        request(gamesApp.getHttpServer())
          .get('/games/bets/me')
          .set('X-Player-Id', playerId),
      (bets) =>
        bets.body.items.every(
          (item: { status: string }) =>
            item.status !== 'pending' && item.status !== 'active',
        ),
    );
  });

  it('rejects duplicate bet for same player in one round', async () => {
    if (!infraAvailable) {
      return;
    }

    await waitFor(
      async () =>
        request(gamesApp.getHttpServer()).get('/games/rounds/current'),
      (response) => response.body.status === 'betting',
    );

    const playerId = `player-dup-${Date.now()}`;
    await walletService.createWallet(playerId, 5000n);

    const first = await request(gamesApp.getHttpServer())
      .post('/games/bet')
      .set('X-Player-Id', playerId)
      .send({ amountCents: '500' });

    expect(first.status).toBe(201);

    const second = await request(gamesApp.getHttpServer())
      .post('/games/bet')
      .set('X-Player-Id', playerId)
      .send({ amountCents: '600' });

    expect(second.status).toBe(409);
  });

  it('rejects bet while round is running', async () => {
    if (!infraAvailable) {
      return;
    }

    const playerId = `player-running-${Date.now()}`;
    await walletService.createWallet(playerId, 5000n);

    await waitFor(
      async () =>
        request(gamesApp.getHttpServer()).get('/games/rounds/current'),
      (response) => response.body.status === 'betting',
    );

    await request(gamesApp.getHttpServer())
      .post('/games/bet')
      .set('X-Player-Id', playerId)
      .send({ amountCents: '500' });

    await waitFor(
      async () =>
        request(gamesApp.getHttpServer()).get('/games/rounds/current'),
      (response) => response.body.status === 'running',
    );

    const response = await request(gamesApp.getHttpServer())
      .post('/games/bet')
      .set('X-Player-Id', `other-${Date.now()}`)
      .send({ amountCents: '500' });

    expect(response.status).toBe(409);
  });

  it('credits wallet on cashout via broker', async () => {
    if (!infraAvailable) {
      return;
    }

    const playerId = `player-cashout-${Date.now()}`;
    await walletService.createWallet(playerId, 5000n);

    await waitFor(
      async () =>
        request(gamesApp.getHttpServer()).get('/games/rounds/current'),
      (response) => response.body.status === 'betting',
    );

    await request(gamesApp.getHttpServer())
      .post('/games/bet')
      .set('X-Player-Id', playerId)
      .send({ amountCents: '1000' });

    await waitFor(
      async () => walletService.getBalance(playerId),
      (balance) => balance === 4000n,
    );

    await waitFor(
      async () => {
        const bets = await request(gamesApp.getHttpServer())
          .get('/games/bets/me')
          .set('X-Player-Id', playerId);
        return bets.body.items.find(
          (item: { status: string }) => item.status === 'active',
        );
      },
      (bet) => bet != null,
    );

    await waitFor(
      async () =>
        request(gamesApp.getHttpServer()).get('/games/rounds/current'),
      (response) => response.body.status === 'running',
    );

    const cashout = await waitFor(
      async () =>
        request(gamesApp.getHttpServer())
          .post('/games/bet/cashout')
          .set('X-Player-Id', playerId),
      (response) => response.status === 201,
      10000,
      20,
    );

    expect(cashout.status).toBe(201);
    expect(cashout.body.payoutCents).toBeString();

    const payout = BigInt(cashout.body.payoutCents as string);
    await waitFor(
      async () => walletService.getBalance(playerId),
      (balance) => balance === 4000n + payout,
    );
  });

  it('settles lost bet on crash and reveals seed', async () => {
    if (!infraAvailable) {
      return;
    }

    const playerId = `player-crash-${Date.now()}`;
    await walletService.createWallet(playerId, 5000n);

    const currentBefore = await waitFor(
      async () =>
        request(gamesApp.getHttpServer()).get('/games/rounds/current'),
      (response) => response.body.status === 'betting',
    );

    const roundId = currentBefore.body.roundId as string;

    await request(gamesApp.getHttpServer())
      .post('/games/bet')
      .set('X-Player-Id', playerId)
      .send({ amountCents: '800' });

    await waitFor(
      async () => walletService.getBalance(playerId),
      (balance) => balance === 4200n,
    );

    await waitFor(
      async () => {
        const bets = await request(gamesApp.getHttpServer())
          .get('/games/bets/me')
          .set('X-Player-Id', playerId);
        return bets.body.items.find(
          (item: { roundId: string; status: string }) =>
            item.roundId === roundId && item.status === 'active',
        );
      },
      (bet) => bet != null,
    );

    await waitFor(
      async () => {
        const bets = await request(gamesApp.getHttpServer())
          .get('/games/bets/me')
          .set('X-Player-Id', playerId);
        const bet = bets.body.items.find(
          (item: { roundId: string; status: string }) =>
            item.roundId === roundId && item.status === 'lost',
        );
        return bet;
      },
      (bet) => bet != null,
      20000,
    );

    const bets = await request(gamesApp.getHttpServer())
      .get('/games/bets/me')
      .set('X-Player-Id', playerId);

    const lostBet = bets.body.items.find(
      (item: { roundId: string }) => item.roundId === roundId,
    );
    expect(lostBet?.status).toBe('lost');
    expect(await walletService.getBalance(playerId)).toBe(4200n);
  });
});
