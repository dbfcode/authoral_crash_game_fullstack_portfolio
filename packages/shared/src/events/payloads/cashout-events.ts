export interface CashoutRequestedPayload {
  playerId: string;
  amountCents: string;
  betId: string;
  roundId: string;
  multiplier: string;
}

export interface CashoutPaidPayload {
  playerId: string;
  amountCents: string;
  betId: string;
  roundId: string;
  multiplier: string;
}

export interface CashoutRejectedPayload {
  playerId: string;
  amountCents: string;
  betId: string;
  roundId: string;
  reason: string;
}
