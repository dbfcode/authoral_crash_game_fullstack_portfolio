import Keycloak from 'keycloak-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { env } from '../config/env';
import { ensureWallet } from '../api/wallets';

type AuthContextValue = {
  ready: boolean;
  authenticated: boolean;
  token: string | null;
  username: string | null;
  playerId: string | null;
  balanceCents: bigint | null;
  walletLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  getToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const keycloak = new Keycloak({
  url: env.keycloakUrl,
  realm: env.keycloakRealm,
  clientId: env.keycloakClientId,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [balanceCents, setBalanceCents] = useState<bigint | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const syncClaims = useCallback(() => {
    if (!keycloak.authenticated || !keycloak.tokenParsed) {
      setUsername(null);
      setPlayerId(null);
      setToken(null);
      return;
    }
    setToken(keycloak.token ?? null);
    setUsername(
      (keycloak.tokenParsed.preferred_username as string | undefined) ??
        (keycloak.tokenParsed.sub as string),
    );
    setPlayerId(keycloak.tokenParsed.sub as string);
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!keycloak.authenticated) {
      return null;
    }
    try {
      await keycloak.updateToken(30);
      setToken(keycloak.token ?? null);
      return keycloak.token ?? null;
    } catch {
      await keycloak.login();
      return null;
    }
  }, []);

  const refreshWallet = useCallback(async () => {
    const accessToken = await getToken();
    if (!accessToken) {
      return;
    }
    setWalletLoading(true);
    try {
      const wallet = await ensureWallet(accessToken);
      setBalanceCents(BigInt(wallet.balanceCents));
    } finally {
      setWalletLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void keycloak
      .init({ onLoad: 'check-sso', pkceMethod: 'S256', checkLoginIframe: false })
      .then((auth) => {
        setAuthenticated(auth);
        syncClaims();
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [syncClaims]);

  useEffect(() => {
    if (!authenticated) {
      setBalanceCents(null);
      return;
    }
    void refreshWallet();
  }, [authenticated, refreshWallet]);

  const login = useCallback(async () => {
    await keycloak.login();
    setAuthenticated(true);
    syncClaims();
  }, [syncClaims]);

  const logout = useCallback(async () => {
    setBalanceCents(null);
    await keycloak.logout({ redirectUri: window.location.origin });
  }, []);

  const value = useMemo(
    () => ({
      ready,
      authenticated,
      token,
      username,
      playerId,
      balanceCents,
      walletLoading,
      login,
      logout,
      refreshWallet,
      getToken,
    }),
    [
      ready,
      authenticated,
      token,
      username,
      playerId,
      balanceCents,
      walletLoading,
      login,
      logout,
      refreshWallet,
      getToken,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
