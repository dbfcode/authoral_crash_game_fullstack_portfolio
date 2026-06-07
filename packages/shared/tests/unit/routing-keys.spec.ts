import { describe, expect, it } from 'bun:test';
import { EventTypes } from '../../src/events/event-types';
import { getRoutingKey, ROUTING_KEYS } from '../../src/messaging/routing-keys';

describe('routing keys', () => {
  it('maps every event type to a routing key', () => {
    for (const type of Object.values(EventTypes)) {
      expect(getRoutingKey(type)).toBe(ROUTING_KEYS[type]);
    }
  });

  it('uses game prefix for game-originated requests', () => {
    expect(getRoutingKey(EventTypes.BET_PLACED_REQUESTED)).toBe(
      'game.bet.placed.requested',
    );
    expect(getRoutingKey(EventTypes.CASHOUT_REQUESTED)).toBe(
      'game.cashout.requested',
    );
  });

  it('uses wallet prefix for wallet responses', () => {
    expect(getRoutingKey(EventTypes.BET_RESERVED)).toBe('wallet.bet.reserved');
    expect(getRoutingKey(EventTypes.CASHOUT_PAID)).toBe('wallet.cashout.paid');
  });
});
