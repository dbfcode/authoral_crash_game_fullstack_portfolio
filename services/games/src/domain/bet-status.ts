export const BetStatus = {
  PENDING: 'pending',
  ACTIVE: 'active',
  CASHED_OUT: 'cashed_out',
  LOST: 'lost',
  REJECTED: 'rejected',
} as const;

export type BetStatus = (typeof BetStatus)[keyof typeof BetStatus];
