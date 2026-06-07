import { describe, expect, it } from 'bun:test';
import {
  keycloakAuthConfigFromEnv,
  verifyKeycloakAccessToken,
} from '../../src/auth/verify-keycloak-access-token';

describe('verifyKeycloakAccessToken', () => {
  it('builds config from env with explicit issuer', () => {
    const config = keycloakAuthConfigFromEnv({
      KEYCLOAK_URL: 'http://keycloak:8080',
      KEYCLOAK_REALM: 'crash-game',
      KEYCLOAK_ISSUER: 'http://localhost:8080/realms/crash-game',
    });

    expect(config.issuer).toBe('http://localhost:8080/realms/crash-game');
    expect(config.jwksUri).toBe(
      'http://keycloak:8080/realms/crash-game/protocol/openid-connect/certs',
    );
  });

  it('rejects malformed token', async () => {
    await expect(
      verifyKeycloakAccessToken('not-a-jwt', {
        issuer: 'http://localhost:8080/realms/crash-game',
        jwksUri:
          'http://127.0.0.1:1/realms/crash-game/protocol/openid-connect/certs',
      }),
    ).rejects.toThrow();
  });
});
