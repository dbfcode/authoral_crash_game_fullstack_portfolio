import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

export type AuthenticatedRequest = {
  headers: Record<string, string | string[] | undefined>;
  playerId?: string;
};

@Injectable()
export class PlayerAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const playerId = request.headers['x-player-id'];

    if (typeof playerId !== 'string' || playerId.trim().length === 0) {
      throw new UnauthorizedException('Missing X-Player-Id header');
    }

    request.playerId = playerId.trim();
    return true;
  }
}
