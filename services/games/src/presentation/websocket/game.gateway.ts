import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsEventTypes } from '@crash/shared';
import { GameQueryService } from '../../application/game-query.service';

function wsCorsOrigin(): string | string[] {
  const raw = process.env.GAMES_WS_CORS_ORIGIN;
  if (!raw) {
    return '*';
  }
  return raw.split(',').map((item) => item.trim());
}

@Injectable()
@WebSocketGateway({
  namespace: '/games',
  cors: { origin: wsCorsOrigin() },
})
export class GameGateway implements OnGatewayConnection, OnModuleInit {
  private readonly logger = new Logger(GameGateway.name);
  private disabled = false;

  @WebSocketServer()
  server!: Server;

  constructor(private readonly gameQuery: GameQueryService) {}

  onModuleInit(): void {
    this.disabled = process.env.GAMES_DISABLE_WS === '1';
    if (this.disabled) {
      this.logger.log('WebSocket gateway disabled (GAMES_DISABLE_WS=1)');
    }
  }

  async handleConnection(client: Socket): Promise<void> {
    if (this.disabled) {
      client.disconnect();
      return;
    }

    try {
      const current = await this.gameQuery.getCurrentRound();
      const history = await this.gameQuery.getRoundHistory(1, 20);

      client.emit(WsEventTypes.ROUND_SNAPSHOT, {
        roundId: current.roundId,
        status: current.status,
        committedRoundHash: current.committedRoundHash,
        nextRoundHash: current.nextRoundHash,
        currentMultiplier: current.currentMultiplier,
        bets: current.bets,
        history: history.items,
      });
    } catch (error) {
      this.logger.warn(`Failed to send snapshot to ${client.id}`, error);
    }
  }

  emitToAll(event: string, payload: unknown): void {
    if (this.disabled || !this.server) {
      return;
    }
    this.server.emit(event, payload);
  }

  emitToClient(clientId: string, event: string, payload: unknown): void {
    if (this.disabled || !this.server) {
      return;
    }
    this.server.to(clientId).emit(event, payload);
  }
}
