import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { GameCommandService } from '../application/game-command.service';
import { GameQueryService } from '../application/game-query.service';
import { PlayerAuthGuard } from './auth/player-auth.guard';
import { PlayerId } from './auth/player-id.decorator';

type PlaceBetBody = {
  amountCents: string;
};

@Controller()
export class BetsController {
  constructor(
    private readonly gameQuery: GameQueryService,
    private readonly gameCommand: GameCommandService,
  ) {}

  @Get('bets/me')
  @UseGuards(PlayerAuthGuard)
  getMyBets(
    @PlayerId() playerId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.gameQuery.getPlayerBets(playerId, Number(page), Number(limit));
  }

  @Post('bet')
  @UseGuards(PlayerAuthGuard)
  placeBet(@PlayerId() playerId: string, @Body() body: PlaceBetBody) {
    return this.gameCommand.placeBet(playerId, body.amountCents);
  }

  @Post('bet/cashout')
  @UseGuards(PlayerAuthGuard)
  cashOut(@PlayerId() playerId: string) {
    return this.gameCommand.cashOut(playerId);
  }
}
