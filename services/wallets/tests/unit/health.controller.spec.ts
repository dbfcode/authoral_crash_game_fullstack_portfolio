import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HealthController } from '../../src/presentation/health.controller';

describe('HealthController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('wallets');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /wallets/health returns ok', async () => {
    const response = await request(app.getHttpServer()).get('/wallets/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'wallet-service',
    });
  });
});
