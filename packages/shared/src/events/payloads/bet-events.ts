export interface BetPlacedRequestedPayload {
  playerId: string;
  amountCents: string;
  betId: string;
  roundId: string;
}

export interface BetReservedPayload {
  playerId: string;
  amountCents: string;
  betId: string;
  roundId: string;
}

export interface BetRejectedPayload {
  playerId: string;
  amountCents: string;
  betId: string;
  roundId: string;
  reason: string;
}

export interface BetLostSettledPayload {
  playerId: string;
  amountCents: string;
  betId: string;
  roundId: string;
}
