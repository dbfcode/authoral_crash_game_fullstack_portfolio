import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoundHistoryItem, VerifyRoundResponse } from '../api/games';
import { verifyRound } from '../api/games';

const HISTORY_LIMIT = 10;

export type VerificationEntry = {
  roundId: string;
  crashPoint: string | null;
  state: 'loading' | 'ok' | 'fail';
  data: VerifyRoundResponse | null;
  error: string | null;
};

export type FairnessVerifications = {
  entries: VerificationEntry[];
  selectedRoundId: string | null;
  selectRound: (roundId: string) => void;
  latestEntry: VerificationEntry | null;
  retry: (roundId: string) => void;
};

export function useFairnessVerifications(
  history: RoundHistoryItem[],
  lastSettledRoundId: string | null,
): FairnessVerifications {
  const [byId, setById] = useState<Map<string, VerificationEntry>>(new Map());
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const inflightRef = useRef<Set<string>>(new Set());
  const fetchedRef = useRef<Set<string>>(new Set());

  const upsert = useCallback((entry: VerificationEntry) => {
    setById((prev) => new Map(prev).set(entry.roundId, entry));
  }, []);

  const fetchOne = useCallback(
    async (roundId: string, crashPoint: string | null, force = false) => {
      if (!force && fetchedRef.current.has(roundId)) {
        return;
      }
      if (inflightRef.current.has(roundId)) {
        return;
      }
      fetchedRef.current.add(roundId);
      inflightRef.current.add(roundId);
      upsert({ roundId, crashPoint, state: 'loading', data: null, error: null });

      try {
        const data = await verifyRound(roundId);
        upsert({
          roundId,
          crashPoint: data.crashPoint ?? crashPoint,
          state: data.valid ? 'ok' : 'fail',
          data,
          error: null,
        });
        setSelectedRoundId((current) => current ?? roundId);
      } catch (err) {
        upsert({
          roundId,
          crashPoint,
          state: 'fail',
          data: null,
          error: err instanceof Error ? err.message : 'Falha ao verificar rodada',
        });
      } finally {
        inflightRef.current.delete(roundId);
      }
    },
    [upsert],
  );

  useEffect(() => {
    const targets = [...history.slice(0, HISTORY_LIMIT)];
    if (lastSettledRoundId && !targets.some((item) => item.roundId === lastSettledRoundId)) {
      targets.unshift({
        roundId: lastSettledRoundId,
        status: 'settled',
        crashPoint: null,
        committedRoundHash: '',
        createdAt: '',
      });
    }

    for (const item of targets) {
      void fetchOne(item.roundId, item.crashPoint);
    }
  }, [history, lastSettledRoundId, fetchOne]);

  const retry = useCallback(
    (roundId: string) => {
      fetchedRef.current.delete(roundId);
      const crashPoint =
        history.find((item) => item.roundId === roundId)?.crashPoint ??
        byId.get(roundId)?.crashPoint ??
        null;
      void fetchOne(roundId, crashPoint, true);
    },
    [byId, fetchOne, history],
  );

  const entries: VerificationEntry[] = [];
  const seen = new Set<string>();
  for (const item of history.slice(0, HISTORY_LIMIT)) {
    if (seen.has(item.roundId)) {
      continue;
    }
    seen.add(item.roundId);
    entries.push(
      byId.get(item.roundId) ?? {
        roundId: item.roundId,
        crashPoint: item.crashPoint,
        state: 'loading',
        data: null,
        error: null,
      },
    );
  }

  const selectedEntry =
    (selectedRoundId ? entries.find((entry) => entry.roundId === selectedRoundId) : null) ??
    entries[0] ??
    null;

  return {
    entries,
    selectedRoundId: selectedEntry?.roundId ?? null,
    selectRound: setSelectedRoundId,
    latestEntry: selectedEntry,
    retry,
  };
}
