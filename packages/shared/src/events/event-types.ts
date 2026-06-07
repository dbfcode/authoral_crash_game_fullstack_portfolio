export const EventTypes = {
  BET_PLACED_REQUESTED: 'BetPlacedRequested',
  BET_RESERVED: 'BetReserved',
  BET_REJECTED: 'BetRejected',
  CASHOUT_REQUESTED: 'CashoutRequested',
  CASHOUT_PAID: 'CashoutPaid',
  CASHOUT_REJECTED: 'CashoutRejected',
  BET_LOST_SETTLED: 'BetLostSettled',
  WALLET_CREDITED: 'WalletCredited',
  WALLET_DEBITED: 'WalletDebited',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];
