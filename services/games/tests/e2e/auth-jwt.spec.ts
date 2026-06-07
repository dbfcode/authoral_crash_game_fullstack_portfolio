import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DomainExceptionFilter } from '../../src/presentation/filters/domain-exception.filter';
import { AppModule } from '../../src/app.module';

const keycloakUrl = process.env.KEYCLOAK_URL ?? 'http://localhost:8080';
const keycloakRealm = process.env.KEYCLOAK_REALM ?? 'crash-game';
const keycloakClientId = process.env.KEYCLOAK_CLIENT_ID ?? 'crash-game-client';

async function fetchTestAccessToken(): Promise<string | null> {
  try {
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: keycloakClientId,
      username: 'player',
      password: 'player123',
    });
    const response = await fetch(
      `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      },
    );
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as { access_token?: string };
    return json.access_token ?? null;
  } catch {
    return null;
  }
}

describe('Auth JWT E2E', () => {
  let app: INestApplication;
  let accessToken: string | null;

  beforeAll(async () => {
    accessToken = await fetchTestAccessToken();
    if (!accessToken) {
      console.warn('Keycloak unavailable — skipping auth JWT e2e');
      return;
    }

    process.env.GAMES_USE_IN_MEMORY = '1';
    process.env.GAMES_DISABLE_ROUND_ENGINE = '1';
    process.env.GAMES_DISABLE_WS = '1';
    process.env.AUTH_DEV_BYPASS = '0';
    process.env.KEYCLOAK_ISSUER =
      process.env.KEYCLOAK_ISSUER ??
      `${keycloakUrl}/realms/${keycloakRealm}`;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.register()],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('games');
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    delete process.env.GAMES_USE_IN_MEMORY;
    delete process.env.GAMES_DISABLE_ROUND_ENGINE;
    delete process.env.GAMES_DISABLE_WS;
    delete process.env.AUTH_DEV_BYPASS;
  });

  it('POST /games/bet without Bearer returns 401', async () => {
    if (!accessToken) {
      return;
    }

    const response = await request(app.getHttpServer())
      .post('/games/bet')
      .send({ amountCents: '100' });

    expect(response.status).toBe(401);
  });

  it('POST /games/bet with invalid Bearer returns 401', async () => {
    if (!accessToken) {
      return;
    }

    const response = await request(app.getHttpServer())
      .post('/games/bet')
      .set('Authorization', 'Bearer invalid-token')
      .send({ amountCents: '100' });

    expect(response.status).toBe(401);
  });

  it('POST /games/bet with valid Keycloak JWT succeeds', async () => {
    if (!accessToken) {
      return;
    }

    const response = await request(app.getHttpServer())
      .post('/games/bet')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amountCents: '100' });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('pending');
  });
});
