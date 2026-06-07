import { createRemoteJWKSet, jwtVerify } from 'jose';

export type KeycloakAuthConfig = {
  issuer: string;
  jwksUri: string;
};

export type KeycloakAccessTokenClaims = {
  sub: string;
  preferred_username?: string;
};

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(jwksUri: string) {
  let jwks = jwksCache.get(jwksUri);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(jwksUri));
    jwksCache.set(jwksUri, jwks);
  }
  return jwks;
}

export function keycloakAuthConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): KeycloakAuthConfig {
  const keycloakUrl = (env.KEYCLOAK_URL ?? 'http://localhost:8080').replace(
    /\/$/,
    '',
  );
  const realm = env.KEYCLOAK_REALM ?? 'crash-game';
  const issuer =
    env.KEYCLOAK_ISSUER ?? `${keycloakUrl}/realms/${realm}`;
  const jwksUri = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`;

  return { issuer, jwksUri };
}

export async function verifyKeycloakAccessToken(
  token: string,
  config: KeycloakAuthConfig,
): Promise<KeycloakAccessTokenClaims> {
  const { payload } = await jwtVerify(token, getJwks(config.jwksUri), {
    issuer: config.issuer,
  });

  if (typeof payload.sub !== 'string' || payload.sub.trim().length === 0) {
    throw new Error('Invalid token: missing sub');
  }

  return {
    sub: payload.sub,
    preferred_username:
      typeof payload.preferred_username === 'string'
        ? payload.preferred_username
        : undefined,
  };
}
