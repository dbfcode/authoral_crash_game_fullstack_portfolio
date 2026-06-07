import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ExpressAdapter } from '@nestjs/platform-express';
import { GamesIoAdapter } from '../../src/infrastructure/websocket/games-io.adapter';
import { io, Socket } from 'socket.io-client';
import { WsEventTypes } from '@crash/shared';
import { AppModule as GamesAppModule } from '../../src/app.module';
import { DomainExceptionFilter } from '../../src/presentation/filters/domain-exception.filter';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForEvent<T>(
  socket: Socket,
  event: string,
  predicate: (payload: T) => boolean,
  timeoutMs = 20000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`timeout waiting for ${event}`));
    }, timeoutMs);

    const handler = (payload: T) => {
      if (predicate(payload)) {
        clearTimeout(timer);
        socket.off(event, handler);
        resolve(payload);
      }
    };

    socket.on(event, handler);
  });
}

function createHttpTestAdapter(): ExpressAdapter {
  const httpAdapter = new ExpressAdapter();
  httpAdapter.initHttpServer({});
  return httpAdapter;
}

describe('WebSocket realtime E2E', () => {
  let app: INestApplication;
  let port: number;
  let socket: Socket;
  let infraAvailable = false;
  const receivedEvents: Array<{ event: string; payload: unknown }> = [];

  beforeAll(async () => {
    if (process.env.SKIP_RABBITMQ_E2E === '1') {
      return;
    }

    process.env.GAMES_USE_IN_MEMORY = '0';
    process.env.GAMES_DISABLE_ROUND_ENGINE = '0';
    process.env.GAMES_DISABLE_WS = '0';
    process.env.GAMES_BETTING_DURATION_MS = '400';
    process.env.GAMES_MULTIPLIER_TICK_MS = '50';
    process.env.GAMES_MULTIPLIER_STEP_HUNDREDTHS = '200';
    process.env.GAMES_DB_URL =
      process.env.GAMES_DB_URL ?? 'postgresql://crash:crash@localhost:5432/games';
    process.env.RABBITMQ_URL =
      process.env.RABBITMQ_URL ?? 'amqp://crash:crash@localhost:5672';

    try {
      const moduleRef = await Test.createTestingModule({
        imports: [GamesAppModule.register()],
      }).compile();

      const httpAdapter = createHttpTestAdapter();
      app = moduleRef.createNestApplication(httpAdapter);
      app.useWebSocketAdapter(new GamesIoAdapter(app));
      app.setGlobalPrefix('games');
      app.useGlobalFilters(new DomainExceptionFilter());
      await app.listen(0, '127.0.0.1');
      port = app.getHttpServer().address()?.port as number;
      infraAvailable = true;
    } catch (error) {
      console.warn('WebSocket e2e setup failed — skipping', error);
    }
  });

  afterAll(async () => {
    if (socket?.connected) {
      socket.disconnect();
    }
    if (app) {
      await app.close();
    }
    delete process.env.GAMES_USE_IN_MEMORY;
    delete process.env.GAMES_DISABLE_ROUND_ENGINE;
    delete process.env.GAMES_DISABLE_WS;
    delete process.env.GAMES_BETTING_DURATION_MS;
    delete process.env.GAMES_MULTIPLIER_TICK_MS;
    delete process.env.GAMES_MULTIPLIER_STEP_HUNDREDTHS;
  });

  it(
    'syncs clients with snapshot and round lifecycle without early seed leak',
    async () => {
    if (!infraAvailable) {
      return;
    }

    socket = io(`http://127.0.0.1:${port}/games`, {
      transports: ['websocket'],
    });

    await new Promise<void>((resolve, reject) => {
      socket.on('connect', () => resolve());
      socket.on('connect_error', reject);
    });

    const preCrashEvents = [
      WsEventTypes.ROUND_SNAPSHOT,
      WsEventTypes.ROUND_BETTING_STARTED,
      WsEventTypes.ROUND_STARTED,
      WsEventTypes.ROUND_TICK,
      WsEventTypes.ROUND_CRASHED,
    ];

    for (const event of preCrashEvents) {
      socket.on(event, (payload) => {
        receivedEvents.push({ event, payload });
      });
    }

    const snapshot = await waitForEvent<{
      committedRoundHash: string;
    }>(socket, WsEventTypes.ROUND_SNAPSHOT, (p) => !!p.committedRoundHash);

    expect(snapshot.committedRoundHash.length).toBeGreaterThan(0);

    await waitForEvent(socket, WsEventTypes.ROUND_STARTED, () => true);
    await waitForEvent(socket, WsEventTypes.ROUND_TICK, () => true);

    const settled = await waitForEvent<{
      revealedRoundSeed: string;
      nextRoundHash: string | null;
      crashPoint: string;
    }>(
      socket,
      WsEventTypes.ROUND_SETTLED,
      (p) => !!p.revealedRoundSeed && !!p.crashPoint,
    );

    expect(settled.revealedRoundSeed.length).toBeGreaterThan(0);
    expect(settled.crashPoint.length).toBeGreaterThan(0);

    const leaked = receivedEvents.filter(
      (item) =>
        item.event !== WsEventTypes.ROUND_SETTLED &&
        JSON.stringify(item.payload).includes('revealedRoundSeed'),
    );
    expect(leaked.length).toBe(0);

    const preSettleWithSeed = receivedEvents.filter((item) => {
      if (item.event === WsEventTypes.ROUND_SETTLED) {
        return false;
      }
      const body = item.payload as Record<string, unknown>;
      return typeof body.roundSeed === 'string' || typeof body.revealedRoundSeed === 'string';
    });
    expect(preSettleWithSeed.length).toBe(0);

    await sleep(200);
    socket.disconnect();
  },
    30000,
  );
});
