import { describe, expect, it } from 'bun:test';
import { createEnvelope } from '../../src/events/envelope';
import { EventTypes } from '../../src/events/event-types';
import {
  parseCents,
  parseEnvelope,
  serializeEnvelope,
  toCentsString,
} from '../../src/messaging/serialization';

describe('EventEnvelope', () => {
  it('creates envelope with required fields', () => {
    const envelope = createEnvelope(
      EventTypes.BET_PLACED_REQUESTED,
      {
        playerId: 'player-1',
        amountCents: '100',
        betId: 'bet-1',
        roundId: 'round-1',
      },
      { eventId: 'evt-1', correlationId: 'bet-1', timestamp: '2026-01-01T00:00:00.000Z' },
    );

    expect(envelope.eventId).toBe('evt-1');
    expect(envelope.correlationId).toBe('bet-1');
    expect(envelope.type).toBe(EventTypes.BET_PLACED_REQUESTED);
    expect(envelope.timestamp).toBe('2026-01-01T00:00:00.000Z');
  });

  it('round-trips through JSON serialization', () => {
    const envelope = createEnvelope(EventTypes.BET_RESERVED, {
      playerId: 'player-1',
      amountCents: '500',
      betId: 'bet-1',
      roundId: 'round-1',
    });

    const parsed = parseEnvelope(serializeEnvelope(envelope));
    expect(parsed).toEqual(envelope);
  });

  it('rejects invalid envelope JSON', () => {
    expect(() => parseEnvelope('{"type":"x"}')).toThrow('Invalid event envelope');
  });
});

describe('cents serialization', () => {
  it('converts bigint to string', () => {
    expect(toCentsString(100n)).toBe('100');
  });

  it('parses cents string to bigint', () => {
    expect(parseCents('250')).toBe(250n);
  });
});
