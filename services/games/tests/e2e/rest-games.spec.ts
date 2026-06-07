import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DomainExceptionFilter } from '../../src/presentation/filters/domain-exception.filter';
import { AppModule } from '../../src/app.module';

describe('REST games', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.GAMES_USE_IN_MEMORY = '1';
    process.env.GAMES_DISABLE_ROUND_ENGINE = '1';
    process.env.GAMES_DISABLE_WS = '1';
    process.env.AUTH_DEV_BYPASS = '1';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.register()],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('games');
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.GAMES_USE_IN_MEMORY;
    delete process.env.GAMES_DISABLE_ROUND_ENGINE;
    delete process.env.GAMES_DISABLE_WS;
    delete process.env.AUTH_DEV_BYPASS;
  });

  it('GET /games/rounds/current returns committedRoundHash after bootstrap', async () => {
    const response = await request(app.getHttpServer()).get('/games/rounds/current');

    expect(response.status).toBe(200);
    expect(response.body.committedRoundHash).toBeString();
    expect(response.body.committedRoundHash.length).toBeGreaterThan(0);
    expect(response.body.status).toBe('betting');
  });

  it('POST /games/bet without auth returns 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/games/bet')
      .send({ amountCents: '100' });

    expect(response.status).toBe(401);
  });

  it('POST /games/bet rejects invalid amount', async () => {
    const response = await request(app.getHttpServer())
      .post('/games/bet')
      .set('X-Player-Id', 'player-1')
      .send({ amountCents: '0' });

    expect(response.status).toBe(400);
  });

  it('POST /games/bet places bet on current round', async () => {
    const playerId = `player-rest-${Date.now()}`;
    const response = await request(app.getHttpServer())
      .post('/games/bet')
      .set('X-Player-Id', playerId)
      .send({ amountCents: '500' });

    expect(response.status).toBe(201);
    expect(response.body.amountCents).toBe('500');
    expect(response.body.status).toBe('pending');
  });
});
