import { Inject, Injectable } from '@nestjs/common';
import {
  BetRejectedPayload,
  BetReservedPayload,
  CashoutPaidPayload,
  CashoutRejectedPayload,
} from '@crash/shared';
import { BetStatus } from '../../domain/bet-status';
import { RoundStatus } from '../../domain/round-status';
import { ROUND_REPOSITORY } from '../../infrastructure/persistence/persistence.constants';
import type { RoundRepository } from '../ports/round.repository';
import { RoundLockService } from '../round-lock.service';

@Injectable()
export class GameEventHandlerService {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
    private readonly roundLock: RoundLockService,
  ) {}

  async handleBetReserved(payload: BetReservedPayload): Promise<void> {
    await this.roundLock.runExclusive(async () => {
      const record = await this.roundRepository.findById(payload.roundId);
      if (!record) {
        return;
      }

      const bet = record.round.getBet(payload.playerId);
      if (!bet || bet.id !== payload.betId) {
        return;
      }

      if (bet.status !== BetStatus.PENDING) {
        return;
      }

      record.round.updateBet(bet.confirm());
      await this.roundRepository.save(record);
    });
  }

  async handleBetRejected(payload: BetRejectedPayload): Promise<void> {
    await this.roundLock.runExclusive(async () => {
      const record = await this.roundRepository.findById(payload.roundId);
      if (!record) {
        return;
      }

      const bet = record.round.getBet(payload.playerId);
      if (!bet || bet.id !== payload.betId) {
        return;
      }

      if (bet.status === BetStatus.PENDING) {
        record.round.removeBet(payload.playerId);
        await this.roundRepository.save(record);
      }
    });
  }

  async handleCashoutPaid(payload: CashoutPaidPayload): Promise<void> {
    await this.roundLock.runExclusive(async () => {
      const record = await this.roundRepository.findById(payload.roundId);
      if (!record) {
        return;
      }

      const bet = record.round.getBet(payload.playerId);
      if (!bet || bet.id !== payload.betId) {
        return;
      }

      if (bet.status !== BetStatus.CASHED_OUT) {
        return;
      }

      await this.roundRepository.save(record);
    });
  }

  async handleCashoutRejected(payload: CashoutRejectedPayload): Promise<void> {
    await this.roundLock.runExclusive(async () => {
      const record = await this.roundRepository.findById(payload.roundId);
      if (!record) {
        return;
      }

      if (record.round.status !== RoundStatus.RUNNING) {
        return;
      }

      const bet = record.round.getBet(payload.playerId);
      if (!bet || bet.id !== payload.betId) {
        return;
      }

      if (bet.status !== BetStatus.CASHED_OUT) {
        return;
      }

      record.round.updateBet(bet.revertCashout());
      await this.roundRepository.save(record);
    });
  }
}
