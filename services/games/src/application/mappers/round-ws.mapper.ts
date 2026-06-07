import { Bet } from '../../domain/bet';
import { Multiplier } from '../../domain/multiplier';
import { RoundRecord } from '../models/round-record';
import type {
  BetCashoutWsPayload,
  BetPlacedWsPayload,
  BetRemovedWsPayload,
  RoundBettingStartedPayload,
  RoundCrashedPayload,
  RoundHistoryItemPayload,
  RoundSettledPayload,
  RoundStartedPayload,
  RoundTickPayload,
} from '@crash/shared';
import type { RoundHistoryItem } from '../models/round-record';

export function toBettingStartedPayload(
  record: RoundRecord,
): RoundBettingStartedPayload {
  return {
    roundId: record.round.id,
    committedRoundHash: record.fairness.committedRoundHash,
  };
}

export function toRoundStartedPayload(record: RoundRecord): RoundStartedPayload {
  const multiplier =
    record.fairness.currentMultiplierHundredths != null
      ? Multiplier.ofHundredths(record.fairness.currentMultiplierHundredths)
      : Multiplier.ofHundredths(100n);

  return {
    roundId: record.round.id,
    currentMultiplier: multiplier.toDecimalString(),
  };
}

export function toRoundTickPayload(
  roundId: string,
  multiplier: Multiplier,
): RoundTickPayload {
  return {
    roundId,
    currentMultiplier: multiplier.toDecimalString(),
  };
}

export function toRoundCrashedPayload(record: RoundRecord): RoundCrashedPayload {
  const crashPoint =
    record.fairness.crashPoint ?? record.round.crashMultiplier?.toDecimalString();
  if (!crashPoint) {
    throw new Error('Crash point required for round:crashed payload');
  }

  return {
    roundId: record.round.id,
    crashPoint,
  };
}

export function toRoundSettledPayload(record: RoundRecord): RoundSettledPayload {
  if (!record.fairness.roundSeed || !record.fairness.crashPoint) {
    throw new Error('Fairness reveal required for round:settled payload');
  }

  return {
    roundId: record.round.id,
    revealedRoundSeed: record.fairness.roundSeed,
    nextRoundHash: record.fairness.nextRoundHash,
    crashPoint: record.fairness.crashPoint,
  };
}

export function toHistoryItems(
  items: RoundHistoryItem[],
): RoundHistoryItemPayload[] {
  return items.map((item) => ({
    roundId: item.roundId,
    crashPoint: item.crashPoint,
    committedRoundHash: item.committedRoundHash,
    createdAt: item.createdAt.toISOString(),
  }));
}

export function toBetPlacedPayload(bet: Bet): BetPlacedWsPayload {
  return {
    betId: bet.id,
    roundId: bet.roundId,
    playerId: bet.playerId,
    amountCents: bet.amountCents.toString(),
    status: bet.status,
  };
}

export function toBetCashoutPayload(
  bet: Bet,
  multiplier: Multiplier,
): BetCashoutWsPayload {
  return {
    betId: bet.id,
    roundId: bet.roundId,
    playerId: bet.playerId,
    amountCents: bet.amountCents.toString(),
    multiplier: multiplier.toDecimalString(),
    payoutCents: bet.payoutCents?.toString() ?? '0',
    status: bet.status,
  };
}

export function toBetRemovedPayload(
  betId: string,
  roundId: string,
  playerId: string,
): BetRemovedWsPayload {
  return { betId, roundId, playerId };
}
