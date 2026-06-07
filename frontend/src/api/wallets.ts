import { apiFetch, ApiError } from './client';

export type WalletResponse = {
  playerId: string;
  balanceCents: string;
};

export async function getMyWallet(token: string): Promise<WalletResponse> {
  return apiFetch<WalletResponse>('/wallets/me', { token });
}

export async function createWallet(token: string): Promise<WalletResponse> {
  return apiFetch<WalletResponse>('/wallets', { method: 'POST', token });
}

export async function ensureWallet(token: string): Promise<WalletResponse> {
  try {
    return await createWallet(token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      return getMyWallet(token);
    }
    throw error;
  }
}
