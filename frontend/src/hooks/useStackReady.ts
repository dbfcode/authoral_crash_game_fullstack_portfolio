import { useEffect, useState } from 'react';
import { env } from '../config/env';

const POLL_MS = 2000;

async function checkUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

async function isStackReady(): Promise<boolean> {
  const [games, wallets, keycloak] = await Promise.all([
    checkUrl(`${env.apiBase}/games/health`),
    checkUrl(`${env.apiBase}/wallets/health`),
    checkUrl(`${env.keycloakUrl}/realms/${env.keycloakRealm}`),
  ]);
  return games && wallets && keycloak;
}

export function useStackReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (cancelled) {
        return;
      }
      if (await isStackReady()) {
        setReady(true);
        return;
      }
      timer = setTimeout(() => void poll(), POLL_MS);
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  return ready;
}
