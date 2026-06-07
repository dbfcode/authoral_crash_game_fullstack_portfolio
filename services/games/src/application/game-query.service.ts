import { Inject, Injectable } from '@nestjs/common';
import {
  FairnessProof,
  PROVABLY_FAIR_ALGORITHM_VERSION,
  verifyRound as verifyFairnessRound,
} from '../domain/provably-fair';
import { NoActiveRoundError, RoundNotFoundError } from '../domain/errors';
import type { BetRepository } from './ports/bet.repository';
import type { RoundRepository } from './ports/round.repository';
import { ROUND_REPOSITORY, BET_REPOSITORY } from '../infrastructure/persistence/persistence.constants';
import { Multiplier } from '../domain/multiplier';
import { RoundRecord } from './models/round-record';

export type CurrentRoundResponse = {
  roundId: string;
  status: string;
  committedRoundHash: string;
  nextRoundHash: string | null;
  currentMultiplier: string | null;
  bets: Array<{
    betId: string;
    playerId: string;
    amountCents: string;
    status: string;
    cashoutMultiplier: string | null;
    payoutCents: string | null;
  }>;
};

export type RoundHistoryResponse = {
  items: Array<{
    roundId: string;
    status: string;
    crashPoint: string | null;
    committedRoundHash: string;
    createdAt: string;
  }>;
  page: number;
  limit: number;
};

export type VerifyRoundResponse = FairnessProof & {
  crashValid: boolean;
  chainValid: boolean;
  valid: boolean;
  reason?: string;
};

export type PlayerBetsResponse = {
  items: Array<{
    betId: string;
    roundId: string;
    amountCents: string;
    status: string;
    cashoutMultiplier: string | null;
    payoutCents: string | null;
    createdAt: string;
  }>;
  page: number;
  limit: number;
};

@Injectable()
export class GameQueryService {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
    @Inject(BET_REPOSITORY)
    private readonly betRepository: BetRepository,
  ) {}

  async getCurrentRound(): Promise<CurrentRoundResponse> {
    const record = await this.roundRepository.findCurrent();
    if (!record) {
      throw new NoActiveRoundError();
    }

    return this.toCurrentRoundResponse(record);
  }

  async getRoundHistory(page: number, limit: number): Promise<RoundHistoryResponse> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const offset = (safePage - 1) * safeLimit;
    const items = await this.roundRepository.findHistory(safeLimit, offset);

    return {
      items: items.map((item) => ({
        roundId: item.roundId,
        status: item.status,
        crashPoint: item.crashPoint,
        committedRoundHash: item.committedRoundHash,
        createdAt: item.createdAt.toISOString(),
      })),
      page: safePage,
      limit: safeLimit,
    };
  }

  async verifyRound(roundId: string): Promise<VerifyRoundResponse> {
    const record = await this.roundRepository.findById(roundId);
    if (!record) {
      throw new RoundNotFoundError(roundId);
    }

    const { fairness } = record;
    const nextRound = await this.roundRepository.findNextRound(roundId);

    if (!fairness.roundSeed || !fairness.crashPoint) {
      return {
        roundId: record.round.id,
        roundHash: fairness.committedRoundHash,
        roundSeed: fairness.roundSeed ?? '',
        nextRoundHash: fairness.nextRoundHash,
        previousRoundHash: fairness.previousRoundHash ?? undefined,
        clientSeed: fairness.clientSeed ?? undefined,
        nonce: fairness.nonce,
        crashPoint: fairness.crashPoint ?? '',
        algorithmVersion: PROVABLY_FAIR_ALGORITHM_VERSION,
        valid: false,
        crashValid: false,
        chainValid: false,
        reason: 'Round fairness data not yet revealed',
      };
    }

    const proof: FairnessProof = {
      roundId: record.round.id,
      roundHash: fairness.committedRoundHash,
      roundSeed: fairness.roundSeed,
      nextRoundHash: fairness.nextRoundHash,
      previousRoundHash: fairness.previousRoundHash ?? undefined,
      clientSeed: fairness.clientSeed ?? undefined,
      nonce: fairness.nonce,
      crashPoint: fairness.crashPoint,
      algorithmVersion: PROVABLY_FAIR_ALGORITHM_VERSION,
    };

    const result = verifyFairnessRound(proof, {
      nextRoundCommittedHash: nextRound?.fairness.committedRoundHash,
    });

    return {
      ...proof,
      valid: result.valid,
      crashValid: result.crashValid,
      chainValid: result.chainValid,
      reason: result.reason,
    };
  }

  async getPlayerBets(
    playerId: string,
    page: number,
    limit: number,
  ): Promise<PlayerBetsResponse> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const offset = (safePage - 1) * safeLimit;
    const records = await this.betRepository.findByPlayer(
      playerId,
      safeLimit,
      offset,
    );

    return {
      items: records.map(({ bet, createdAt }) => ({
        betId: bet.id,
        roundId: bet.roundId,
        amountCents: bet.amountCents.toString(),
        status: bet.status,
        cashoutMultiplier: bet.cashoutMultiplier?.toDecimalString() ?? null,
        payoutCents: bet.payoutCents?.toString() ?? null,
        createdAt: createdAt.toISOString(),
      })),
      page: safePage,
      limit: safeLimit,
    };
  }

  private toCurrentRoundResponse(record: RoundRecord): CurrentRoundResponse {
    const multiplier =
      record.fairness.currentMultiplierHundredths != null
        ? Multiplier.ofHundredths(record.fairness.currentMultiplierHundredths)
        : record.round.status === 'running'
          ? Multiplier.ofHundredths(100n)
          : null;

    return {
      roundId: record.round.id,
      status: record.round.status,
      committedRoundHash: record.fairness.committedRoundHash,
      nextRoundHash: record.fairness.nextRoundHash,
      currentMultiplier: multiplier?.toDecimalString() ?? null,
      bets: record.round.bets.map((bet) => ({
        betId: bet.id,
        playerId: bet.playerId,
        amountCents: bet.amountCents.toString(),
        status: bet.status,
        cashoutMultiplier: bet.cashoutMultiplier?.toDecimalString() ?? null,
        payoutCents: bet.payoutCents?.toString() ?? null,
      })),
    };
  }
}
