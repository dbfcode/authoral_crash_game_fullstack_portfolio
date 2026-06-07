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
import { GAME_REALTIME_PUBLISHER } from '../../infrastructure/websocket/websocket.constants';
import {
  toBetPlacedPayload,
  toBetRemovedPayload,
} from '../mappers/round-ws.mapper';
import type { RoundRepository } from '../ports/round.repository';
import type { GameRealtimePublisher } from '../ports/game-realtime.publisher';
import { RoundLockService } from '../round-lock.service';

@Injectable()
export class GameEventHandlerService {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
    @Inject(GAME_REALTIME_PUBLISHER)
    private readonly realtime: GameRealtimePublisher,
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

      const confirmed = bet.confirm();
      record.round.updateBet(confirmed);
      await this.roundRepository.save(record);
      this.realtime.broadcastBetPlaced(toBetPlacedPayload(confirmed));
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
        this.realtime.broadcastBetRemoved(
          toBetRemovedPayload(payload.betId, payload.roundId, payload.playerId),
        );
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

      const reverted = bet.revertCashout();
      record.round.updateBet(reverted);
      await this.roundRepository.save(record);
      this.realtime.broadcastBetPlaced(toBetPlacedPayload(reverted));
    });
  }
}
