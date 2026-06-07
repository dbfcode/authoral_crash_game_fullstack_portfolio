import { BetStatus } from '../../domain/bet-status';
import { Bet } from '../../domain/bet';
import { Multiplier } from '../../domain/multiplier';
import { Round } from '../../domain/round';
import { RoundStatus } from '../../domain/round-status';
import {
  RoundFairnessData,
  RoundRecord,
} from '../../application/models/round-record';

type RoundRow = {
  id: string;
  status: string;
  committed_round_hash: string;
  next_round_hash: string | null;
  previous_round_hash: string | null;
  round_seed: string | null;
  crash_point: string | null;
  nonce: string;
  client_seed: string | null;
  algorithm_version: string;
  current_multiplier_hundredths: string | null;
  chain_index: number;
  created_at: Date;
};

type BetRow = {
  id: string;
  round_id: string;
  player_id: string;
  amount_cents: string;
  status: string;
  cashout_multiplier: string | null;
  payout_cents: string | null;
  created_at: Date;
};

export function mapFairnessFromRow(row: RoundRow): RoundFairnessData {
  return {
    committedRoundHash: row.committed_round_hash,
    nextRoundHash: row.next_round_hash,
    previousRoundHash: row.previous_round_hash,
    roundSeed: row.round_seed,
    crashPoint: row.crash_point,
    nonce: Number(row.nonce),
    clientSeed: row.client_seed,
    algorithmVersion: row.algorithm_version,
    currentMultiplierHundredths: row.current_multiplier_hundredths
      ? BigInt(row.current_multiplier_hundredths)
      : null,
    chainIndex: row.chain_index,
  };
}

export function mapRoundRecordFromRows(
  roundRow: RoundRow,
  betRows: BetRow[],
): RoundRecord {
  const bets = betRows.map(mapBetFromRow);
  const crashMultiplier = roundRow.crash_point
    ? Multiplier.fromDecimalString(roundRow.crash_point)
    : null;

  return {
    round: Round.rehydrate({
      roundId: roundRow.id,
      status: roundRow.status as RoundStatus,
      bets,
      crashMultiplier,
    }),
    fairness: mapFairnessFromRow(roundRow),
    createdAt: roundRow.created_at,
  };
}

export function mapBetFromRow(row: BetRow): Bet {
  return Bet.rehydrate({
    id: row.id,
    playerId: row.player_id,
    roundId: row.round_id,
    amountCents: BigInt(row.amount_cents),
    status: row.status as BetStatus,
    cashoutMultiplier: row.cashout_multiplier
      ? Multiplier.fromDecimalString(row.cashout_multiplier)
      : null,
    payoutCents: row.payout_cents ? BigInt(row.payout_cents) : null,
  });
}

export function roundRecordToRow(record: RoundRecord): RoundRow {
  const { round, fairness } = record;
  return {
    id: round.id,
    status: round.status,
    committed_round_hash: fairness.committedRoundHash,
    next_round_hash: fairness.nextRoundHash,
    previous_round_hash: fairness.previousRoundHash,
    round_seed: fairness.roundSeed,
    crash_point:
      fairness.crashPoint ?? round.crashMultiplier?.toDecimalString() ?? null,
    nonce: String(fairness.nonce),
    client_seed: fairness.clientSeed,
    algorithm_version: fairness.algorithmVersion,
    current_multiplier_hundredths: fairness.currentMultiplierHundredths
      ? fairness.currentMultiplierHundredths.toString()
      : null,
    chain_index: fairness.chainIndex,
    created_at: record.createdAt,
  };
}

export function betToRow(bet: Bet, createdAt: Date): BetRow {
  return {
    id: bet.id,
    round_id: bet.roundId,
    player_id: bet.playerId,
    amount_cents: bet.amountCents.toString(),
    status: bet.status,
    cashout_multiplier: bet.cashoutMultiplier?.toDecimalString() ?? null,
    payout_cents: bet.payoutCents?.toString() ?? null,
    created_at: createdAt,
  };
}
