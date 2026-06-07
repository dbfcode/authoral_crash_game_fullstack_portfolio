import { BetAlreadyCashedOutError } from './errors';
import { MoneyCents } from './money-cents';
import { Multiplier } from './multiplier';
import { BetStatus } from './bet-status';

export class Bet {
  private constructor(
    readonly id: string,
    readonly playerId: string,
    readonly roundId: string,
    readonly amountCents: bigint,
    private _status: BetStatus,
    private _cashoutMultiplier: Multiplier | null = null,
    private _payoutCents: bigint | null = null,
  ) {}

  static create(params: {
    id: string;
    playerId: string;
    roundId: string;
    amountCents: bigint;
  }): Bet {
    const amount = MoneyCents.of(params.amountCents).amount;
    return new Bet(
      params.id,
      params.playerId,
      params.roundId,
      amount,
      BetStatus.ACTIVE,
    );
  }

  get status(): BetStatus {
    return this._status;
  }

  get cashoutMultiplier(): Multiplier | null {
    return this._cashoutMultiplier;
  }

  get payoutCents(): bigint | null {
    return this._payoutCents;
  }

  cashOut(atMultiplier: Multiplier): Bet {
    if (this._status === BetStatus.CASHED_OUT) {
      throw new BetAlreadyCashedOutError();
    }
    if (this._status !== BetStatus.ACTIVE) {
      throw new BetAlreadyCashedOutError();
    }

    const payout = atMultiplier.calculatePayout(this.amountCents);
    return new Bet(
      this.id,
      this.playerId,
      this.roundId,
      this.amountCents,
      BetStatus.CASHED_OUT,
      atMultiplier,
      payout,
    );
  }

  markLost(): Bet {
    if (this._status === BetStatus.CASHED_OUT) {
      return this;
    }
    return new Bet(
      this.id,
      this.playerId,
      this.roundId,
      this.amountCents,
      BetStatus.LOST,
      null,
      null,
    );
  }
}
