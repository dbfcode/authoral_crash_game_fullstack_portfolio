import { useCallback, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { WsEventTypes } from '@crash/shared/websocket/ws-event-types';
import type {
  RoundCrashedPayload,
  RoundHistoryItemPayload,
  RoundHistoryUpdatedPayload,
  RoundSettledPayload,
  RoundSnapshotPayload,
  RoundStartedPayload,
  RoundTickPayload,
} from '@crash/shared/websocket/payloads/round-events';
import type { BetItem, RoundHistoryItem } from '../api/games';
import { env } from '../config/env';

export type GameState = {
  connected: boolean;
  roundId: string | null;
  status: string;
  committedRoundHash: string;
  nextRoundHash: string | null;
  currentMultiplier: string | null;
  crashPoint: string | null;
  revealedRoundSeed: string | null;
  bets: BetItem[];
  history: RoundHistoryItem[];
  crashedFlash: boolean;
  bettingStartedAt: number | null;
};

const initialState: GameState = {
  connected: false,
  roundId: null,
  status: 'betting',
  committedRoundHash: '',
  nextRoundHash: null,
  currentMultiplier: null,
  crashPoint: null,
  revealedRoundSeed: null,
  bets: [],
  history: [],
  crashedFlash: false,
  bettingStartedAt: null,
};

function mapHistory(items: RoundHistoryItemPayload[]): RoundHistoryItem[] {
  return items.map((item) => ({
    roundId: item.roundId,
    status: 'settled',
    crashPoint: item.crashPoint,
    committedRoundHash: item.committedRoundHash,
    createdAt: item.createdAt,
  }));
}

export function useGameSocket(enabled: boolean) {
  const [state, setState] = useState<GameState>(initialState);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let socket: Socket | null = io(`${env.wsUrl}/games`, {
      transports: ['websocket'],
      reconnection: true,
    });

    const onConnect = () => {
      setState((prev) => ({ ...prev, connected: true }));
    };

    const onDisconnect = () => {
      setState((prev) => ({ ...prev, connected: false }));
    };

    const onSnapshot = (payload: RoundSnapshotPayload) => {
      setState((prev) => ({
        ...prev,
        roundId: payload.roundId,
        status: payload.status,
        committedRoundHash: payload.committedRoundHash,
        nextRoundHash: payload.nextRoundHash,
        currentMultiplier: payload.currentMultiplier,
        bets: payload.bets,
        history: mapHistory(payload.history),
        crashPoint: null,
        revealedRoundSeed: null,
        crashedFlash: false,
        bettingStartedAt: payload.status === 'betting' ? Date.now() : prev.bettingStartedAt,
      }));
    };

    const onBettingStarted = (payload: { roundId: string; committedRoundHash: string }) => {
      setState((prev) => ({
        ...prev,
        roundId: payload.roundId,
        status: 'betting',
        committedRoundHash: payload.committedRoundHash,
        currentMultiplier: null,
        crashPoint: null,
        revealedRoundSeed: null,
        bets: [],
        crashedFlash: false,
        bettingStartedAt: Date.now(),
      }));
    };

    const onStarted = (payload: RoundStartedPayload) => {
      setState((prev) => ({
        ...prev,
        status: 'running',
        currentMultiplier: payload.currentMultiplier,
        bettingStartedAt: null,
      }));
    };

    const onTick = (payload: RoundTickPayload) => {
      setState((prev) => ({
        ...prev,
        status: 'running',
        currentMultiplier: payload.currentMultiplier,
      }));
    };

    const onCrashed = (payload: RoundCrashedPayload) => {
      setState((prev) => ({
        ...prev,
        crashPoint: payload.crashPoint,
        crashedFlash: true,
      }));
      window.setTimeout(() => {
        setState((prev) => ({ ...prev, crashedFlash: false }));
      }, 800);
    };

    const onSettled = (payload: RoundSettledPayload) => {
      setState((prev) => ({
        ...prev,
        status: 'settled',
        revealedRoundSeed: payload.revealedRoundSeed,
        crashPoint: payload.crashPoint,
        nextRoundHash: payload.nextRoundHash,
      }));
    };

    const onHistoryUpdated = (payload: RoundHistoryUpdatedPayload) => {
      setState((prev) => ({
        ...prev,
        history: mapHistory(payload.items),
      }));
    };

    const onBetPlaced = (payload: BetItem) => {
      setState((prev) => {
        const exists = prev.bets.some((b) => b.betId === payload.betId);
        const bets = exists
          ? prev.bets.map((b) => (b.betId === payload.betId ? { ...b, ...payload } : b))
          : [...prev.bets, payload];
        return { ...prev, bets };
      });
    };

    const onBetRemoved = (payload: { betId: string }) => {
      setState((prev) => ({
        ...prev,
        bets: prev.bets.filter((b) => b.betId !== payload.betId),
      }));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(WsEventTypes.ROUND_SNAPSHOT, onSnapshot);
    socket.on(WsEventTypes.ROUND_BETTING_STARTED, onBettingStarted);
    socket.on(WsEventTypes.ROUND_STARTED, onStarted);
    socket.on(WsEventTypes.ROUND_TICK, onTick);
    socket.on(WsEventTypes.ROUND_CRASHED, onCrashed);
    socket.on(WsEventTypes.ROUND_SETTLED, onSettled);
    socket.on(WsEventTypes.ROUND_HISTORY_UPDATED, onHistoryUpdated);
    socket.on(WsEventTypes.BET_PLACED, onBetPlaced);
    socket.on(WsEventTypes.BET_CASHOUT, onBetPlaced);
    socket.on(WsEventTypes.BET_REMOVED, onBetRemoved);

    return () => {
      socket?.off('connect', onConnect);
      socket?.off('disconnect', onDisconnect);
      socket?.disconnect();
      socket = null;
    };
  }, [enabled]);

  const resetFlash = useCallback(() => {
    setState((prev) => ({ ...prev, crashedFlash: false }));
  }, []);

  return { game: state, resetFlash };
}
