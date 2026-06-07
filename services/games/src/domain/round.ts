import { Bet } from './bet';
import { BetStatus } from './bet-status';
import { assertBetWithinLimits } from './bet-limits';
import {
  BetNotFoundError,
  DuplicateBetError,
  InvalidRoundStateError,
} from './errors';
import { Multiplier } from './multiplier';
import { RoundStatus } from './round-status';

export class Round {
  private constructor(
    readonly id: string,
    private _status: RoundStatus,
    private readonly _bets: Map<string, Bet>,
    private _crashMultiplier: Multiplier | null = null,
  ) {}

  static create(params: { roundId: string }): Round {
    return new Round(params.roundId, RoundStatus.BETTING, new Map());
  }

  static rehydrate(params: {
    roundId: string;
    status: RoundStatus;
    bets: Bet[];
    crashMultiplier: Multiplier | null;
  }): Round {
    const bets = new Map(params.bets.map((bet) => [bet.playerId, bet]));
    return new Round(
      params.roundId,
      params.status,
      bets,
      params.crashMultiplier,
    );
  }

  get status(): RoundStatus {
    return this._status;
  }

  get crashMultiplier(): Multiplier | null {
    return this._crashMultiplier;
  }

  get bets(): readonly Bet[] {
    return [...this._bets.values()];
  }

  getBet(playerId: string): Bet | undefined {
    return this._bets.get(playerId);
  }

  placeBet(params: {
    betId: string;
    playerId: string;
    amountCents: bigint;
  }): Bet {
    this.assertStatus(RoundStatus.BETTING, 'place bet');

    const existing = this._bets.get(params.playerId);
    if (existing && existing.status !== BetStatus.REJECTED) {
      throw new DuplicateBetError(params.playerId);
    }

    assertBetWithinLimits(params.amountCents);

    const bet = Bet.create({
      id: params.betId,
      playerId: params.playerId,
      roundId: this.id,
      amountCents: params.amountCents,
    });

    this._bets.set(params.playerId, bet);
    return bet;
  }

  removeBet(playerId: string): void {
    this._bets.delete(playerId);
  }

  updateBet(bet: Bet): void {
    this._bets.set(bet.playerId, bet);
  }

  confirmBet(playerId: string): Bet {
    const bet = this._bets.get(playerId);
    if (!bet) {
      throw new BetNotFoundError(playerId);
    }
    const confirmed = bet.confirm();
    this._bets.set(playerId, confirmed);
    return confirmed;
  }

  removePendingBets(): void {
    for (const [playerId, bet] of this._bets) {
      if (bet.status === BetStatus.PENDING) {
        this._bets.delete(playerId);
      }
    }
  }

  startRunning(): void {
    this.assertStatus(RoundStatus.BETTING, 'start running');
    this._status = RoundStatus.RUNNING;
  }

  cashOut(params: { playerId: string; atMultiplier: Multiplier }): Bet {
    this.assertStatus(RoundStatus.RUNNING, 'cash out');

    const bet = this._bets.get(params.playerId);
    if (!bet) {
      throw new BetNotFoundError(params.playerId);
    }

    const cashed = bet.cashOut(params.atMultiplier);
    this._bets.set(params.playerId, cashed);
    return cashed;
  }

  crash(params: { crashMultiplier: Multiplier }): void {
    this.assertStatus(RoundStatus.RUNNING, 'crash');
    this._crashMultiplier = params.crashMultiplier;

    for (const [playerId, bet] of this._bets) {
      this._bets.set(playerId, bet.markLost());
    }

    this._status = RoundStatus.CRASHED;
  }

  settle(): void {
    this.assertStatus(RoundStatus.CRASHED, 'settle');
    this._status = RoundStatus.SETTLED;
  }

  private assertStatus(expected: RoundStatus, action: string): void {
    if (this._status !== expected) {
      throw new InvalidRoundStateError(action, this._status);
    }
  }
}
