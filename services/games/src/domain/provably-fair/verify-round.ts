import { computeCrashPoint } from './crash-calculator';
import {
  FairnessProof,
  PROVABLY_FAIR_ALGORITHM_VERSION,
  VerifyChainLinkParams,
  VerifyRoundResult,
} from './fairness-proof';
import { hashRoundSeed } from './hash-round-seed';

export function verifyChainLink(
  params: VerifyChainLinkParams,
): { valid: boolean; reason?: string } {
  if (hashRoundSeed(params.roundSeed) !== params.roundHash) {
    return { valid: false, reason: 'roundSeed does not match roundHash' };
  }

  if (
    params.previousRoundHash !== undefined &&
    params.previousRoundSeed !== undefined &&
    hashRoundSeed(params.previousRoundSeed) !== params.previousRoundHash
  ) {
    return {
      valid: false,
      reason: 'previousRoundSeed does not match previousRoundHash',
    };
  }

  if (params.nextRoundHash != null) {
    if (params.nextRoundSeed !== undefined) {
      if (hashRoundSeed(params.nextRoundSeed) !== params.nextRoundHash) {
        return {
          valid: false,
          reason: 'nextRoundSeed does not match nextRoundHash',
        };
      }
    } else if (params.nextRoundCommittedHash !== undefined) {
      if (params.nextRoundCommittedHash !== params.nextRoundHash) {
        return {
          valid: false,
          reason: 'nextRoundHash does not match next round commitment',
        };
      }
    }
  }

  return { valid: true };
}

export type VerifyRoundOptions = {
  previousRoundSeed?: string;
  nextRoundSeed?: string;
  nextRoundCommittedHash?: string;
};

export function verifyRound(
  proof: FairnessProof,
  options: VerifyRoundOptions = {},
): VerifyRoundResult {
  if (proof.algorithmVersion !== PROVABLY_FAIR_ALGORITHM_VERSION) {
    return {
      valid: false,
      crashValid: false,
      chainValid: false,
      reason: `unsupported algorithmVersion: ${proof.algorithmVersion}`,
    };
  }

  const hashValid = hashRoundSeed(proof.roundSeed) === proof.roundHash;
  if (!hashValid) {
    return {
      valid: false,
      crashValid: false,
      chainValid: false,
      reason: 'roundSeed does not match roundHash',
    };
  }

  const computed = computeCrashPoint({
    roundSeed: proof.roundSeed,
    nonce: proof.nonce,
    clientSeed: proof.clientSeed,
  });
  const crashValid = computed.toDecimalString() === proof.crashPoint;

  const chainResult = verifyChainLink({
    roundHash: proof.roundHash,
    roundSeed: proof.roundSeed,
    previousRoundHash: proof.previousRoundHash,
    previousRoundSeed: options.previousRoundSeed,
    nextRoundHash: proof.nextRoundHash,
    nextRoundSeed: options.nextRoundSeed,
    nextRoundCommittedHash: options.nextRoundCommittedHash,
  });

  const chainValid = chainResult.valid;
  const valid = crashValid && chainValid;

  if (!valid) {
    const reason = !crashValid
      ? 'crashPoint does not match recomputed value'
      : chainResult.reason;
    return { valid: false, crashValid, chainValid, reason };
  }

  return { valid: true, crashValid: true, chainValid: true };
}

export function buildFairnessProof(params: {
  roundId: string;
  commit: {
    roundSeed: string;
    roundHash: string;
    nextRoundHash: string | null;
  };
  nonce: number | string;
  clientSeed?: string;
  previousRoundHash?: string;
}): FairnessProof {
  const crashPoint = computeCrashPoint({
    roundSeed: params.commit.roundSeed,
    nonce: params.nonce,
    clientSeed: params.clientSeed,
  });

  return {
    roundId: params.roundId,
    roundHash: params.commit.roundHash,
    roundSeed: params.commit.roundSeed,
    nextRoundHash: params.commit.nextRoundHash,
    previousRoundHash: params.previousRoundHash,
    clientSeed: params.clientSeed,
    nonce: params.nonce,
    crashPoint: crashPoint.toDecimalString(),
    algorithmVersion: PROVABLY_FAIR_ALGORITHM_VERSION,
  };
}
