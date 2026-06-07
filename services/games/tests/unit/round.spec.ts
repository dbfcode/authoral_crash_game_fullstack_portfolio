import { describe, expect, it } from 'bun:test';
import { BetStatus } from '../../src/domain/bet-status';
import {
  BetLimitError,
  BetNotFoundError,
  DuplicateBetError,
  InvalidRoundStateError,
} from '../../src/domain/errors';
import { Multiplier } from '../../src/domain/multiplier';
import { Round } from '../../src/domain/round';
import { RoundStatus } from '../../src/domain/round-status';
import { MAX_BET_CENTS, MIN_BET_CENTS } from '../../src/domain/bet-limits';

describe('Round', () => {
  it('happy path: bet, run, cashout at 2.00x', () => {
    const round = Round.create({ roundId: 'round-1' });

    round.placeBet({
      betId: 'bet-1',
      playerId: 'player-1',
      amountCents: 500n,
    });
    round.startRunning();

    const cashed = round.cashOut({
      playerId: 'player-1',
      atMultiplier: Multiplier.fromDecimalString('2.00'),
    });

    expect(cashed.payoutCents).toBe(1000n);
    expect(cashed.status).toBe(BetStatus.CASHED_OUT);
  });

  it('cashout at 1.00x returns bet amount', () => {
    const round = Round.create({ roundId: 'round-1' });
    round.placeBet({
      betId: 'bet-1',
      playerId: 'player-1',
      amountCents: 250n,
    });
    round.startRunning();

    const cashed = round.cashOut({
      playerId: 'player-1',
      atMultiplier: Multiplier.ofHundredths(100),
    });

    expect(cashed.payoutCents).toBe(250n);
  });

  it('rejects duplicate bet for same player', () => {
    const round = Round.create({ roundId: 'round-1' });
    round.placeBet({
      betId: 'bet-1',
      playerId: 'player-1',
      amountCents: 500n,
    });

    expect(() =>
      round.placeBet({
        betId: 'bet-2',
        playerId: 'player-1',
        amountCents: 600n,
      }),
    ).toThrow(DuplicateBetError);
  });

  it('rejects bet below minimum', () => {
    const round = Round.create({ roundId: 'round-1' });
    expect(() =>
      round.placeBet({
        betId: 'bet-1',
        playerId: 'player-1',
        amountCents: MIN_BET_CENTS - 1n,
      }),
    ).toThrow(BetLimitError);
  });

  it('rejects bet above maximum', () => {
    const round = Round.create({ roundId: 'round-1' });
    expect(() =>
      round.placeBet({
        betId: 'bet-1',
        playerId: 'player-1',
        amountCents: MAX_BET_CENTS + 1n,
      }),
    ).toThrow(BetLimitError);
  });

  it('rejects placeBet when running', () => {
    const round = Round.create({ roundId: 'round-1' });
    round.startRunning();

    expect(() =>
      round.placeBet({
        betId: 'bet-1',
        playerId: 'player-1',
        amountCents: 500n,
      }),
    ).toThrow(InvalidRoundStateError);
  });

  it('rejects cashOut during betting', () => {
    const round = Round.create({ roundId: 'round-1' });
    round.placeBet({
      betId: 'bet-1',
      playerId: 'player-1',
      amountCents: 500n,
    });

    expect(() =>
      round.cashOut({
        playerId: 'player-1',
        atMultiplier: Multiplier.ofHundredths(100),
      }),
    ).toThrow(InvalidRoundStateError);
  });

  it('rejects cashOut without bet', () => {
    const round = Round.create({ roundId: 'round-1' });
    round.startRunning();

    expect(() =>
      round.cashOut({
        playerId: 'player-1',
        atMultiplier: Multiplier.ofHundredths(100),
      }),
    ).toThrow(BetNotFoundError);
  });

  it('crash: player A cashes out, player B loses', () => {
    const round = Round.create({ roundId: 'round-1' });
    round.placeBet({
      betId: 'bet-a',
      playerId: 'player-a',
      amountCents: 500n,
    });
    round.placeBet({
      betId: 'bet-b',
      playerId: 'player-b',
      amountCents: 300n,
    });
    round.startRunning();

    round.cashOut({
      playerId: 'player-a',
      atMultiplier: Multiplier.fromDecimalString('1.50'),
    });

    round.crash({ crashMultiplier: Multiplier.fromDecimalString('2.00') });

    expect(round.getBet('player-a')?.status).toBe(BetStatus.CASHED_OUT);
    expect(round.getBet('player-a')?.payoutCents).toBe(750n);
    expect(round.getBet('player-b')?.status).toBe(BetStatus.LOST);
    expect(round.status).toBe(RoundStatus.CRASHED);
  });

  it('settle only after crashed', () => {
    const round = Round.create({ roundId: 'round-1' });
    round.startRunning();
    round.crash({ crashMultiplier: Multiplier.ofHundredths(150) });

    round.settle();
    expect(round.status).toBe(RoundStatus.SETTLED);
  });

  it('rejects settle before crash', () => {
    const round = Round.create({ roundId: 'round-1' });
    round.startRunning();

    expect(() => round.settle()).toThrow(InvalidRoundStateError);
  });

  it('rejects mutations after settled', () => {
    const round = Round.create({ roundId: 'round-1' });
    round.startRunning();
    round.crash({ crashMultiplier: Multiplier.ofHundredths(120) });
    round.settle();

    expect(() =>
      round.placeBet({
        betId: 'bet-1',
        playerId: 'player-1',
        amountCents: 500n,
      }),
    ).toThrow(InvalidRoundStateError);
  });

  it('full lifecycle through settle', () => {
    const round = Round.create({ roundId: 'round-1' });
    expect(round.status).toBe(RoundStatus.BETTING);

    round.placeBet({
      betId: 'bet-1',
      playerId: 'player-1',
      amountCents: 1000n,
    });
    round.startRunning();
    expect(round.status).toBe(RoundStatus.RUNNING);

    round.cashOut({
      playerId: 'player-1',
      atMultiplier: Multiplier.fromDecimalString('3.00'),
    });
    round.crash({ crashMultiplier: Multiplier.fromDecimalString('3.50') });
    round.settle();

    expect(round.status).toBe(RoundStatus.SETTLED);
    expect(round.getBet('player-1')?.payoutCents).toBe(3000n);
  });
});
