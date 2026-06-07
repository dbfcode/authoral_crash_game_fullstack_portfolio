import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PROVABLY_FAIR_ALGORITHM_VERSION } from '../domain/provably-fair';
import { Round } from '../domain/round';
import { ROUND_REPOSITORY } from '../infrastructure/persistence/persistence.constants';
import { RoundRecord } from './models/round-record';
import type { RoundRepository } from './ports/round.repository';
import { GameStateService } from './game-state.service';

@Injectable()
export class RoundBootstrapService implements OnModuleInit {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
    private readonly gameState: GameStateService,
  ) {}

  async onModuleInit(): Promise<void> {
    const current = await this.roundRepository.findCurrent();
    if (current) {
      return;
    }

    const chain = this.gameState.getOrCreateChain();
    const commit = chain.commit(this.gameState.getChainIndex());
    const roundId = randomUUID();

    const record: RoundRecord = {
      round: Round.create({ roundId }),
      fairness: {
        committedRoundHash: commit.roundHash,
        nextRoundHash: commit.nextRoundHash,
        previousRoundHash: null,
        roundSeed: null,
        crashPoint: null,
        nonce: commit.index,
        clientSeed: null,
        algorithmVersion: PROVABLY_FAIR_ALGORITHM_VERSION,
        currentMultiplierHundredths: null,
        chainIndex: commit.index,
      },
      createdAt: new Date(),
    };

    await this.roundRepository.save(record);
  }
}
