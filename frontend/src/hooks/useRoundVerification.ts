import { useCallback, useEffect, useRef, useState } from 'react';
import { verifyRound, type VerifyRoundResponse } from '../api/games';

export type VerificationState = 'idle' | 'loading' | 'ok' | 'fail';

export type RoundVerification = {
  state: VerificationState;
  roundId: string | null;
  data: VerifyRoundResponse | null;
  error: string | null;
  retry: () => void;
};

type Input = {
  roundId: string | null;
  status: string;
  revealedRoundSeed: string | null;
};

export function useRoundVerification(input: Input): RoundVerification {
  const [state, setState] = useState<VerificationState>('idle');
  const [roundId, setRoundId] = useState<string | null>(null);
  const [data, setData] = useState<VerifyRoundResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedRef = useRef<string | null>(null);
  const pendingRoundRef = useRef<string | null>(null);

  const runVerify = useCallback(async (targetRoundId: string) => {
    setState('loading');
    setError(null);
    try {
      const result = await verifyRound(targetRoundId);
      setRoundId(targetRoundId);
      setData(result);
      setState(result.valid ? 'ok' : 'fail');
      lastFetchedRef.current = targetRoundId;
    } catch (err) {
      setState('fail');
      setError(err instanceof Error ? err.message : 'Falha ao verificar rodada');
    }
  }, []);

  useEffect(() => {
    if (!input.roundId) {
      setData(null);
      setState('idle');
      setError(null);
      lastFetchedRef.current = null;
      return;
    }

    if (input.status === 'betting' || input.status === 'running') {
      if (roundId !== null && roundId !== input.roundId) {
        setData(null);
        setState('idle');
        setError(null);
        lastFetchedRef.current = null;
      }
      return;
    }

    if (input.status !== 'settled' || !input.revealedRoundSeed) {
      return;
    }
    if (lastFetchedRef.current === input.roundId) {
      return;
    }
    pendingRoundRef.current = input.roundId;
    void runVerify(input.roundId);
  }, [input.status, input.revealedRoundSeed, input.roundId, runVerify, roundId]);

  const retry = useCallback(() => {
    const target = pendingRoundRef.current ?? roundId ?? input.roundId;
    if (!target) {
      return;
    }
    lastFetchedRef.current = null;
    void runVerify(target);
  }, [roundId, input.roundId, runVerify]);

  return { state, roundId, data, error, retry };
}
