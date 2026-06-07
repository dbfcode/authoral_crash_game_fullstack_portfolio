import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  keycloakAuthConfigFromEnv,
  verifyKeycloakAccessToken,
} from '@crash/shared';

export type AuthenticatedRequest = {
  headers: Record<string, string | string[] | undefined>;
  playerId?: string;
  username?: string;
};

@Injectable()
export class PlayerAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (process.env.AUTH_DEV_BYPASS === '1') {
      const playerId = request.headers['x-player-id'];
      if (typeof playerId !== 'string' || playerId.trim().length === 0) {
        throw new UnauthorizedException('Missing X-Player-Id header');
      }
      request.playerId = playerId.trim();
      return true;
    }

    const authorization = request.headers.authorization;
    if (
      typeof authorization !== 'string' ||
      !authorization.startsWith('Bearer ')
    ) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authorization.slice('Bearer '.length).trim();
    if (token.length === 0) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    try {
      const claims = await verifyKeycloakAccessToken(
        token,
        keycloakAuthConfigFromEnv(),
      );
      request.playerId = claims.sub;
      request.username = claims.preferred_username;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
