import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { parseCents } from '@crash/shared';
import { NoActiveRoundError } from '../domain/errors';
import { MoneyCents } from '../domain/money-cents';
import { Multiplier } from '../domain/multiplier';
import { ROUND_REPOSITORY } from '../infrastructure/persistence/persistence.constants';
import { GAME_EVENT_PUBLISHER } from '../infrastructure/messaging/messaging.constants';
import type { RoundRepository } from './ports/round.repository';
import type { GameEventPublisher } from './ports/game-event.publisher';

@Injectable()
export class GameCommandService {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
    @Inject(GAME_EVENT_PUBLISHER)
    private readonly eventPublisher: GameEventPublisher,
  ) {}

  async placeBet(playerId: string, amountCentsRaw: string) {
    const amountCents = parseCents(amountCentsRaw);
    MoneyCents.of(amountCents);

    const record = await this.roundRepository.findCurrent();
    if (!record) {
      throw new NoActiveRoundError();
    }

    const betId = randomUUID();
    record.round.placeBet({
      betId,
      playerId,
      amountCents,
    });

    await this.roundRepository.save(record);

    await this.eventPublisher.publishBetPlacedRequested(
      {
        betId,
        playerId,
        roundId: record.round.id,
        amountCents: amountCents.toString(),
      },
      betId,
    );

    return {
      betId,
      roundId: record.round.id,
      amountCents: amountCents.toString(),
      status: 'active',
    };
  }

  async cashOut(playerId: string) {
    const record = await this.roundRepository.findCurrent();
    if (!record) {
      throw new NoActiveRoundError();
    }

    const multiplier =
      record.fairness.currentMultiplierHundredths != null
        ? Multiplier.ofHundredths(record.fairness.currentMultiplierHundredths)
        : Multiplier.ofHundredths(100n);

    const bet = record.round.cashOut({ playerId, atMultiplier: multiplier });
    await this.roundRepository.save(record);

    await this.eventPublisher.publishCashoutRequested(
      {
        betId: bet.id,
        playerId,
        roundId: record.round.id,
        amountCents: bet.amountCents.toString(),
        multiplier: multiplier.toDecimalString(),
      },
      bet.id,
    );

    return {
      betId: bet.id,
      roundId: record.round.id,
      multiplier: multiplier.toDecimalString(),
      payoutCents: bet.payoutCents?.toString() ?? null,
      status: bet.status,
    };
  }
}
