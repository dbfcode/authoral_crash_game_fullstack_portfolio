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
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('games');
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.GAMES_USE_IN_MEMORY;
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
    const response = await request(app.getHttpServer())
      .post('/games/bet')
      .set('X-Player-Id', 'player-1')
      .send({ amountCents: '500' });

    expect(response.status).toBe(201);
    expect(response.body.amountCents).toBe('500');
    expect(response.body.status).toBe('active');
  });
});
