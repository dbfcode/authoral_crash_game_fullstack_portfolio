import { useEffect, useState } from 'react';
import { env } from '../config/env';

type Props = {
  bettingStartedAt: number | null;
  status: string;
};

export function BettingCountdown({ bettingStartedAt, status }: Props) {
  const remaining = useRemainingMs(bettingStartedAt, status);

  if (status !== 'betting' || remaining === null) {
    return (
      <p className="text-sm text-gray-400">
        {status === 'running' ? 'Rodada em andamento' : 'Aguardando próxima rodada…'}
      </p>
    );
  }

  return (
    <p className="text-sm font-medium text-casino-purple">
      Apostas fecham em <span className="text-white">{Math.ceil(remaining / 1000)}s</span>
    </p>
  );
}

function useRemainingMs(bettingStartedAt: number | null, status: string): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status !== 'betting' || bettingStartedAt === null) {
      return;
    }
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [bettingStartedAt, status]);

  if (status !== 'betting' || bettingStartedAt === null) {
    return null;
  }

  const elapsed = now - bettingStartedAt;
  return Math.max(0, env.bettingDurationMs - elapsed);
}
