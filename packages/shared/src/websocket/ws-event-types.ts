export const WsEventTypes = {
  ROUND_SNAPSHOT: 'round:snapshot',
  ROUND_BETTING_STARTED: 'round:betting-started',
  ROUND_STARTED: 'round:started',
  ROUND_TICK: 'round:tick',
  ROUND_CRASHED: 'round:crashed',
  ROUND_SETTLED: 'round:settled',
  ROUND_HISTORY_UPDATED: 'round:history-updated',
  BET_PLACED: 'bet:placed',
  BET_CASHOUT: 'bet:cashout',
  BET_REMOVED: 'bet:removed',
} as const;

export type WsEventType = (typeof WsEventTypes)[keyof typeof WsEventTypes];
