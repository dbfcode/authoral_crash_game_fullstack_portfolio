import { describe, expect, it } from 'bun:test';
import { BetAlreadyCashedOutError } from '../../src/domain/errors';
import { Bet } from '../../src/domain/bet';
import { BetStatus } from '../../src/domain/bet-status';
import { Multiplier } from '../../src/domain/multiplier';

describe('Bet', () => {
  it('creates pending bet', () => {
    const bet = Bet.create({
      id: 'bet-1',
      playerId: 'player-1',
      roundId: 'round-1',
      amountCents: 500n,
    });

    expect(bet.status).toBe(BetStatus.PENDING);
    expect(bet.amountCents).toBe(500n);
    expect(bet.payoutCents).toBeNull();
  });

  it('confirms pending bet to active', () => {
    const bet = Bet.create({
      id: 'bet-1',
      playerId: 'player-1',
      roundId: 'round-1',
      amountCents: 500n,
    });

    const active = bet.confirm();
    expect(active.status).toBe(BetStatus.ACTIVE);
  });

  it('cashes out with payout', () => {
    const bet = Bet.create({
      id: 'bet-1',
      playerId: 'player-1',
      roundId: 'round-1',
      amountCents: 500n,
    }).confirm();

    const cashed = bet.cashOut(Multiplier.fromDecimalString('2.00'));

    expect(cashed.status).toBe(BetStatus.CASHED_OUT);
    expect(cashed.payoutCents).toBe(1000n);
    expect(cashed.cashoutMultiplier?.toDecimalString()).toBe('2.00');
  });

  it('rejects second cashout', () => {
    const cashed = Bet.create({
      id: 'bet-1',
      playerId: 'player-1',
      roundId: 'round-1',
      amountCents: 500n,
    })
      .confirm()
      .cashOut(Multiplier.ofHundredths(100));

    expect(() => cashed.cashOut(Multiplier.ofHundredths(200))).toThrow(
      BetAlreadyCashedOutError,
    );
  });

  it('marks lost when active', () => {
    const bet = Bet.create({
      id: 'bet-1',
      playerId: 'player-1',
      roundId: 'round-1',
      amountCents: 500n,
    }).confirm();

    const lost = bet.markLost();
    expect(lost.status).toBe(BetStatus.LOST);
  });

  it('preserves cashed out bet on markLost', () => {
    const bet = Bet.create({
      id: 'bet-1',
      playerId: 'player-1',
      roundId: 'round-1',
      amountCents: 500n,
    })
      .confirm()
      .cashOut(Multiplier.ofHundredths(150));

    const afterCrash = bet.markLost();
    expect(afterCrash.status).toBe(BetStatus.CASHED_OUT);
    expect(afterCrash.payoutCents).toBe(750n);
  });
});
