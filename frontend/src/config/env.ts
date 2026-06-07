export const env = {
  apiBase: import.meta.env.VITE_API_BASE ?? 'http://localhost:8000',
  wsUrl: import.meta.env.VITE_WS_URL ?? 'http://localhost:4001',
  keycloakUrl: import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8080',
  keycloakRealm: import.meta.env.VITE_KEYCLOAK_REALM ?? 'crash-game',
  keycloakClientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'crash-game-client',
  bettingDurationMs: Number(import.meta.env.VITE_BETTING_DURATION_MS ?? '7000'),
};
