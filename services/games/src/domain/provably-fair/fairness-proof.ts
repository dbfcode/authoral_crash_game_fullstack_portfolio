export const PROVABLY_FAIR_ALGORITHM_VERSION = 'v1-chain' as const;

export type FairnessProof = {
  roundId: string;
  roundHash: string;
  roundSeed: string;
  nextRoundHash: string | null;
  previousRoundHash?: string;
  clientSeed?: string;
  nonce: number | string;
  crashPoint: string;
  algorithmVersion: typeof PROVABLY_FAIR_ALGORITHM_VERSION;
};

export type VerifyRoundResult = {
  valid: boolean;
  crashValid: boolean;
  chainValid: boolean;
  reason?: string;
};

export type VerifyChainLinkParams = {
  roundHash: string;
  roundSeed: string;
  previousRoundHash?: string;
  previousRoundSeed?: string;
  nextRoundHash?: string | null;
  nextRoundSeed?: string;
  /** roundHash of round i+1 — must equal nextRoundHash from round i */
  nextRoundCommittedHash?: string;
};
