export type RoundBettingStartedPayload = {
  roundId: string;
  committedRoundHash: string;
};

export type RoundStartedPayload = {
  roundId: string;
  currentMultiplier: string;
};

export type RoundTickPayload = {
  roundId: string;
  currentMultiplier: string;
};

export type RoundCrashedPayload = {
  roundId: string;
  crashPoint: string;
};

export type RoundSettledPayload = {
  roundId: string;
  revealedRoundSeed: string;
  nextRoundHash: string | null;
  crashPoint: string;
};

export type RoundHistoryItemPayload = {
  roundId: string;
  crashPoint: string | null;
  committedRoundHash: string;
  createdAt: string;
};

export type RoundHistoryUpdatedPayload = {
  items: RoundHistoryItemPayload[];
};

export type RoundSnapshotBetPayload = {
  betId: string;
  playerId: string;
  amountCents: string;
  status: string;
  cashoutMultiplier: string | null;
  payoutCents: string | null;
};

export type RoundSnapshotPayload = {
  roundId: string;
  status: string;
  committedRoundHash: string;
  nextRoundHash: string | null;
  currentMultiplier: string | null;
  bets: RoundSnapshotBetPayload[];
  history: RoundHistoryItemPayload[];
};
