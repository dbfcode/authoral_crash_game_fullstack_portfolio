import { describe, expect, it } from 'bun:test';
import { WsEventTypes } from '../../src/websocket/ws-event-types';

describe('WsEventTypes', () => {
  it('defines round lifecycle events', () => {
    expect(WsEventTypes.ROUND_BETTING_STARTED).toBe('round:betting-started');
    expect(WsEventTypes.ROUND_STARTED).toBe('round:started');
    expect(WsEventTypes.ROUND_TICK).toBe('round:tick');
    expect(WsEventTypes.ROUND_CRASHED).toBe('round:crashed');
    expect(WsEventTypes.ROUND_SETTLED).toBe('round:settled');
    expect(WsEventTypes.ROUND_SNAPSHOT).toBe('round:snapshot');
  });

  it('defines bet events', () => {
    expect(WsEventTypes.BET_PLACED).toBe('bet:placed');
    expect(WsEventTypes.BET_CASHOUT).toBe('bet:cashout');
    expect(WsEventTypes.BET_REMOVED).toBe('bet:removed');
  });
});
