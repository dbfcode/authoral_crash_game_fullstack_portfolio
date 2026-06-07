export const RoundStatus = {
  BETTING: 'betting',
  RUNNING: 'running',
  CRASHED: 'crashed',
  SETTLED: 'settled',
} as const;

export type RoundStatus = (typeof RoundStatus)[keyof typeof RoundStatus];
