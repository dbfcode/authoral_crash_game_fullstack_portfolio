import { describe, expect, it } from 'bun:test';
import {
  buildFairnessChecks,
  fairnessPhaseLabel,
  translateVerifyReason,
  verificationSummary,
} from '../../src/utils/fairness-labels';
import type { VerifyRoundResponse } from '../../src/api/games';

function sampleVerify(overrides: Partial<VerifyRoundResponse> = {}): VerifyRoundResponse {
  return {
    roundId: 'round-1',
    roundHash: 'abc',
    roundSeed: 'seed',
    nextRoundHash: 'def',
    crashPoint: '2.50',
    nonce: 0,
    algorithmVersion: 'v1-chain',
    valid: true,
    crashValid: true,
    chainValid: true,
    ...overrides,
  };
}

describe('fairness-labels', () => {
  it('maps phase labels', () => {
    expect(fairnessPhaseLabel('betting')).toBe('Apostas abertas');
    expect(fairnessPhaseLabel('running')).toBe('Multiplicador subindo');
    expect(fairnessPhaseLabel('settled')).toBe('Rodada encerrada');
  });

  it('translates known verify reasons', () => {
    expect(translateVerifyReason('roundSeed does not match roundHash')).toContain('seed revelada');
    expect(translateVerifyReason('unknown')).toBe('unknown');
    expect(translateVerifyReason(undefined)).toBeNull();
  });

  it('builds three checks with pass/fail', () => {
    const ok = buildFairnessChecks(sampleVerify());
    expect(ok).toHaveLength(3);
    expect(ok.every((c) => c.passed === true)).toBe(true);

    const fail = buildFairnessChecks(
      sampleVerify({ valid: false, crashValid: false, reason: 'crashPoint does not match recomputed value' }),
    );
    expect(fail.find((c) => c.key === 'crash')?.passed).toBe(false);
    expect(fail.find((c) => c.key === 'commitment')?.passed).toBe(true);
  });

  it('summarizes verification state', () => {
    expect(verificationSummary(sampleVerify({ roundSeed: '' }))).toContain('Aguardando');
    expect(verificationSummary(sampleVerify())).toContain('2.50x');
  });
});
