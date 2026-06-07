export const WALLET_QUEUE = 'wallet-service.events';
export const GAME_QUEUE = 'game-service.events';

export const WALLET_QUEUE_BINDINGS = [
  'game.bet.placed.requested',
  'game.cashout.requested',
] as const;

export const GAME_QUEUE_BINDINGS = [
  'wallet.bet.reserved',
  'wallet.bet.rejected',
  'wallet.cashout.paid',
  'wallet.cashout.rejected',
] as const;
