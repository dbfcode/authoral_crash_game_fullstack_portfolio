export const BetStatus = {
  ACTIVE: 'active',
  CASHED_OUT: 'cashed_out',
  LOST: 'lost',
} as const;

export type BetStatus = (typeof BetStatus)[keyof typeof BetStatus];
