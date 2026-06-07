import { apiFetch } from './client';

export type BetItem = {
  betId: string;
  roundId?: string;
  playerId?: string;
  amountCents: string;
  status: string;
  cashoutMultiplier: string | null;
  payoutCents: string | null;
  createdAt?: string;
};

export type CurrentRound = {
  roundId: string;
  status: string;
  committedRoundHash: string;
  nextRoundHash: string | null;
  currentMultiplier: string | null;
  bets: BetItem[];
};

export type RoundHistoryItem = {
  roundId: string;
  status: string;
  crashPoint: string | null;
  committedRoundHash: string;
  createdAt: string;
};

export type VerifyRoundResponse = {
  roundId: string;
  roundHash: string;
  roundSeed: string;
  nextRoundHash: string | null;
  previousRoundHash?: string;
  crashPoint: string;
  nonce: number;
  algorithmVersion: string;
  valid: boolean;
  crashValid: boolean;
  chainValid: boolean;
  reason?: string;
};

export async function getCurrentRound(): Promise<CurrentRound> {
  return apiFetch<CurrentRound>('/games/rounds/current');
}

export async function getRoundHistory(limit = 20): Promise<{ items: RoundHistoryItem[] }> {
  return apiFetch<{ items: RoundHistoryItem[] }>(`/games/rounds/history?limit=${limit}`);
}

export async function verifyRound(roundId: string): Promise<VerifyRoundResponse> {
  return apiFetch<VerifyRoundResponse>(`/games/rounds/${roundId}/verify`);
}

export async function placeBet(token: string, amountCents: string) {
  return apiFetch<{ betId: string; status: string; amountCents: string }>('/games/bet', {
    method: 'POST',
    token,
    body: JSON.stringify({ amountCents }),
  });
}

export async function cashOut(token: string) {
  return apiFetch<{ betId: string; payoutCents: string; multiplier: string; status: string }>(
    '/games/bet/cashout',
    { method: 'POST', token },
  );
}

export async function getMyBets(token: string) {
  return apiFetch<{ items: BetItem[] }>('/games/bets/me', { token });
}
