import { Round } from '../../domain/round';

export type RoundFairnessData = {
  committedRoundHash: string;
  nextRoundHash: string | null;
  previousRoundHash: string | null;
  roundSeed: string | null;
  crashPoint: string | null;
  nonce: number;
  clientSeed: string | null;
  algorithmVersion: string;
  currentMultiplierHundredths: bigint | null;
  chainIndex: number;
};

export type RoundRecord = {
  round: Round;
  fairness: RoundFairnessData;
  createdAt: Date;
};

export type RoundHistoryItem = {
  roundId: string;
  status: string;
  crashPoint: string | null;
  committedRoundHash: string;
  createdAt: Date;
};
