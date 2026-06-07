import { EventType, EventTypes } from '../events/event-types';

export const EXCHANGE_NAME = 'crash.events';

export const ROUTING_KEYS: Record<EventType, string> = {
  [EventTypes.BET_PLACED_REQUESTED]: 'game.bet.placed.requested',
  [EventTypes.BET_RESERVED]: 'wallet.bet.reserved',
  [EventTypes.BET_REJECTED]: 'wallet.bet.rejected',
  [EventTypes.CASHOUT_REQUESTED]: 'game.cashout.requested',
  [EventTypes.CASHOUT_PAID]: 'wallet.cashout.paid',
  [EventTypes.CASHOUT_REJECTED]: 'wallet.cashout.rejected',
  [EventTypes.BET_LOST_SETTLED]: 'game.bet.lost.settled',
  [EventTypes.WALLET_CREDITED]: 'wallet.wallet.credited',
  [EventTypes.WALLET_DEBITED]: 'wallet.wallet.debited',
};

export function getRoutingKey(type: EventType): string {
  return ROUTING_KEYS[type];
}
