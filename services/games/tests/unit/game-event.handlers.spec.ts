import { describe, expect, it, beforeEach } from 'bun:test';
import {
  BetReservedPayload,
  createEnvelope,
  EventTypes,
} from '@crash/shared';
import { GameEventHandlers } from '../../src/application/handlers/game-event.handlers';

describe('GameEventHandlers', () => {
  let handlers: GameEventHandlers;

  beforeEach(() => {
    handlers = new GameEventHandlers();
  });

  it('records BetReserved events', () => {
    const payload: BetReservedPayload = {
      playerId: 'player-1',
      amountCents: '200',
      betId: 'bet-1',
      roundId: 'round-1',
    };

    handlers.handle(
      EventTypes.BET_RESERVED,
      createEnvelope(EventTypes.BET_RESERVED, payload, {
        correlationId: 'bet-1',
      }),
    );

    expect(handlers.getLastBetReserved()).toEqual(payload);
    expect(handlers.getEvents()).toHaveLength(1);
  });

  it('records BetRejected events', () => {
    handlers.handle(
      EventTypes.BET_REJECTED,
      createEnvelope(EventTypes.BET_REJECTED, {
        playerId: 'player-1',
        amountCents: '200',
        betId: 'bet-1',
        roundId: 'round-1',
        reason: 'INSUFFICIENT_BALANCE',
      }),
    );

    expect(handlers.getLastBetRejected()?.reason).toBe('INSUFFICIENT_BALANCE');
  });
});
