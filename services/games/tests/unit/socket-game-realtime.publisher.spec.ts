import { describe, expect, it, beforeEach } from 'bun:test';
import { WsEventTypes } from '@crash/shared';
import { SocketGameRealtimePublisher } from '../../src/infrastructure/websocket/socket-game-realtime.publisher';
import { GameGateway } from '../../src/presentation/websocket/game.gateway';

describe('SocketGameRealtimePublisher', () => {
  let emitted: Array<{ event: string; payload: unknown }>;
  let publisher: SocketGameRealtimePublisher;

  beforeEach(() => {
    emitted = [];
    const gateway = {
      emitToAll: (event: string, payload: unknown) => {
        emitted.push({ event, payload });
      },
      emitToClient: (clientId: string, event: string, payload: unknown) => {
        emitted.push({ event, payload, clientId });
      },
    } as unknown as GameGateway;

    publisher = new SocketGameRealtimePublisher(gateway);
  });

  it('broadcasts round lifecycle events with correct names', () => {
    publisher.broadcastBettingStarted({
      roundId: 'r1',
      committedRoundHash: 'hash',
    });
    publisher.broadcastRoundStarted({
      roundId: 'r1',
      currentMultiplier: '1.00',
    });
    publisher.broadcastTick({ roundId: 'r1', currentMultiplier: '1.05' });
    publisher.broadcastCrashed({ roundId: 'r1', crashPoint: '2.00' });
    publisher.broadcastSettled({
      roundId: 'r1',
      revealedRoundSeed: 'seed',
      nextRoundHash: 'next',
      crashPoint: '2.00',
    });

    expect(emitted.map((item) => item.event)).toEqual([
      WsEventTypes.ROUND_BETTING_STARTED,
      WsEventTypes.ROUND_STARTED,
      WsEventTypes.ROUND_TICK,
      WsEventTypes.ROUND_CRASHED,
      WsEventTypes.ROUND_SETTLED,
    ]);
  });

  it('broadcasts bet events', () => {
    publisher.broadcastBetPlaced({
      betId: 'b1',
      roundId: 'r1',
      playerId: 'p1',
      amountCents: '500',
      status: 'pending',
    });
    publisher.broadcastBetRemoved({
      betId: 'b1',
      roundId: 'r1',
      playerId: 'p1',
    });

    expect(emitted[0]?.event).toBe(WsEventTypes.BET_PLACED);
    expect(emitted[1]?.event).toBe(WsEventTypes.BET_REMOVED);
  });
});
