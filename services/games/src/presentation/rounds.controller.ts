import { Controller, Get, Param, Query } from '@nestjs/common';
import { GameQueryService } from '../application/game-query.service';

@Controller('rounds')
export class RoundsController {
  constructor(private readonly gameQuery: GameQueryService) {}

  @Get('current')
  getCurrent() {
    return this.gameQuery.getCurrentRound();
  }

  @Get('history')
  getHistory(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.gameQuery.getRoundHistory(Number(page), Number(limit));
  }

  @Get(':roundId/verify')
  verify(@Param('roundId') roundId: string) {
    return this.gameQuery.verifyRound(roundId);
  }
}
