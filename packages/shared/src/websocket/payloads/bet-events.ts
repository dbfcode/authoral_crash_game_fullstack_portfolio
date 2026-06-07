export type BetPlacedWsPayload = {
  betId: string;
  roundId: string;
  playerId: string;
  amountCents: string;
  status: string;
};

export type BetCashoutWsPayload = {
  betId: string;
  roundId: string;
  playerId: string;
  amountCents: string;
  multiplier: string;
  payoutCents: string;
  status: string;
};

export type BetRemovedWsPayload = {
  betId: string;
  roundId: string;
  playerId: string;
};
