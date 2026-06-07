export interface WalletCreditedPayload {
  playerId: string;
  amountCents: string;
  reference: string;
}

export interface WalletDebitedPayload {
  playerId: string;
  amountCents: string;
  reference: string;
}
