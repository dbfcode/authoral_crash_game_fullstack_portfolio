import { describe, expect, it } from 'bun:test';
import {
  DuplicateReferenceError,
  InsufficientBalanceError,
  InvalidAmountError,
} from '../../src/domain/errors';
import { LedgerEntryType } from '../../src/domain/ledger-entry';
import { Wallet } from '../../src/domain/wallet';

describe('Wallet', () => {
  it('creates wallet with zero balance by default', () => {
    const wallet = Wallet.create('player-1');
    expect(wallet.playerId).toBe('player-1');
    expect(wallet.balance).toBe(0n);
    expect(wallet.ledger).toEqual([]);
  });

  it('creates wallet with initial balance', () => {
    const wallet = Wallet.create('player-1', 1000n);
    expect(wallet.balance).toBe(1000n);
  });

  it('credits cents and records ledger entry', () => {
    const wallet = Wallet.create('player-1', 100n);
    wallet.credit(50n, 'deposit-1');

    expect(wallet.balance).toBe(150n);
    expect(wallet.ledger).toHaveLength(1);
    expect(wallet.ledger[0]).toMatchObject({
      type: LedgerEntryType.CREDIT,
      amountCents: 50n,
      reference: 'deposit-1',
    });
  });

  it('debits cents and records ledger entry', () => {
    const wallet = Wallet.create('player-1', 1000n);
    wallet.debit(300n, 'bet-reserve');

    expect(wallet.balance).toBe(700n);
    expect(wallet.ledger[0]).toMatchObject({
      type: LedgerEntryType.DEBIT,
      amountCents: 300n,
      reference: 'bet-reserve',
    });
  });

  it('rejects debit greater than balance', () => {
    const wallet = Wallet.create('player-1', 100n);
    expect(() => wallet.debit(200n, 'bet-reserve')).toThrow(
      InsufficientBalanceError,
    );
    expect(wallet.balance).toBe(100n);
    expect(wallet.ledger).toHaveLength(0);
  });

  it('rejects invalid credit amount', () => {
    const wallet = Wallet.create('player-1');
    expect(() => wallet.credit(0n, 'bad')).toThrow(InvalidAmountError);
  });

  it('rejects invalid debit amount', () => {
    const wallet = Wallet.create('player-1', 100n);
    expect(() => wallet.debit(-1n, 'bad')).toThrow(InvalidAmountError);
  });

  it('keeps precision with bigint arithmetic', () => {
    const wallet = Wallet.create('player-1', 100n);
    wallet.credit(50n, 'a');
    expect(wallet.balance).toBe(150n);
  });

  it('rejects duplicate reference', () => {
    const wallet = Wallet.create('player-1', 500n);
    wallet.debit(100n, 'bet-1');
    expect(() => wallet.debit(100n, 'bet-1')).toThrow(DuplicateReferenceError);
    expect(wallet.balance).toBe(400n);
    expect(wallet.ledger).toHaveLength(1);
  });
});
