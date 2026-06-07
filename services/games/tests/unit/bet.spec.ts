import { describe, expect, it } from 'bun:test';
import { BetAlreadyCashedOutError } from '../../src/domain/errors';
import { Bet } from '../../src/domain/bet';
import { BetStatus } from '../../src/domain/bet-status';
import { Multiplier } from '../../src/domain/multiplier';

describe('Bet', () => {
  it('creates active bet', () => {
    const bet = Bet.create({
      id: 'bet-1',
      playerId: 'player-1',
      roundId: 'round-1',
      amountCents: 500n,
    });

    expect(bet.status).toBe(BetStatus.ACTIVE);
    expect(bet.amountCents).toBe(500n);
    expect(bet.payoutCents).toBeNull();
  });

  it('cashes out with payout', () => {
    const bet = Bet.create({
      id: 'bet-1',
      playerId: 'player-1',
      roundId: 'round-1',
      amountCents: 500n,
    });

    const cashed = bet.cashOut(Multiplier.fromDecimalString('2.00'));

    expect(cashed.status).toBe(BetStatus.CASHED_OUT);
    expect(cashed.payoutCents).toBe(1000n);
    expect(cashed.cashoutMultiplier?.toDecimalString()).toBe('2.00');
  });

  it('rejects second cashout', () => {
    const bet = Bet.create({
      id: 'bet-1',
      playerId: 'player-1',
      roundId: 'round-1',
      amountCents: 500n,
    }).cashOut(Multiplier.ofHundredths(100));

    expect(() => bet.cashOut(Multiplier.ofHundredths(200))).toThrow(
      BetAlreadyCashedOutError,
    );
  });

  it('marks lost when active', () => {
    const bet = Bet.create({
      id: 'bet-1',
      playerId: 'player-1',
      roundId: 'round-1',
      amountCents: 500n,
    });

    const lost = bet.markLost();
    expect(lost.status).toBe(BetStatus.LOST);
  });

  it('preserves cashed out bet on markLost', () => {
    const bet = Bet.create({
      id: 'bet-1',
      playerId: 'player-1',
      roundId: 'round-1',
      amountCents: 500n,
    }).cashOut(Multiplier.ofHundredths(150));

    const afterCrash = bet.markLost();
    expect(afterCrash.status).toBe(BetStatus.CASHED_OUT);
    expect(afterCrash.payoutCents).toBe(750n);
  });
});
