import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { WalletService } from '../application/wallet.service';
import { PlayerAuthGuard } from './auth/player-auth.guard';
import { PlayerId } from './auth/player-id.decorator';

function initialBalanceFromEnv(): bigint {
  const raw = process.env.WALLETS_INITIAL_BALANCE_CENTS ?? '500000';
  try {
    const value = BigInt(raw);
    return value >= 0n ? value : 0n;
  } catch {
    return 500000n;
  }
}

@Controller()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  @UseGuards(PlayerAuthGuard)
  async createWallet(@PlayerId() playerId: string) {
    const wallet = await this.walletService.createWallet(
      playerId,
      initialBalanceFromEnv(),
    );
    return {
      playerId: wallet.playerId,
      balanceCents: wallet.balance.toString(),
    };
  }

  @Get('me')
  @UseGuards(PlayerAuthGuard)
  async getMyWallet(@PlayerId() playerId: string) {
    const balanceCents = await this.walletService.getBalance(playerId);
    return {
      playerId,
      balanceCents: balanceCents.toString(),
    };
  }
}
