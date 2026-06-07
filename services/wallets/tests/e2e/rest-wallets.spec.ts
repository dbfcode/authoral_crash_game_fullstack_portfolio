import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { WalletService } from '../../src/application/wallet.service';
import { WalletRepository } from '../../src/application/ports/wallet.repository';
import { InMemoryWalletRepository } from '../../src/infrastructure/persistence/in-memory-wallet.repository';
import { PlayerAuthGuard } from '../../src/presentation/auth/player-auth.guard';
import { WalletController } from '../../src/presentation/wallet.controller';

describe('REST wallets', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        PlayerAuthGuard,
        {
          provide: 'WALLET_REPOSITORY',
          useFactory: () => new InMemoryWalletRepository(),
        },
        {
          provide: WalletService,
          useFactory: (repository: WalletRepository) =>
            new WalletService(repository),
          inject: ['WALLET_REPOSITORY'],
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('wallets');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /wallets creates wallet for player', async () => {
    const response = await request(app.getHttpServer())
      .post('/wallets')
      .set('X-Player-Id', 'player-rest-1');

    expect(response.status).toBe(201);
    expect(response.body.playerId).toBe('player-rest-1');
    expect(response.body.balanceCents).toBe('0');
  });

  it('GET /wallets/me returns balance', async () => {
    const walletService = app.get(WalletService);
    await walletService.createWallet('player-rest-2', 1500n);

    const response = await request(app.getHttpServer())
      .get('/wallets/me')
      .set('X-Player-Id', 'player-rest-2');

    expect(response.status).toBe(200);
    expect(response.body.balanceCents).toBe('1500');
  });
});
