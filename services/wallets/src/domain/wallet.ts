import {
  DuplicateReferenceError,
  InsufficientBalanceError,
  InvalidAmountError,
} from './errors';
import { LedgerEntry } from './ledger-entry';
import { MoneyCents } from './money-cents';

export class Wallet {
  private constructor(
    readonly playerId: string,
    private _balance: bigint,
    private readonly _ledger: LedgerEntry[] = [],
  ) {}

  static create(playerId: string, initialBalance = 0n): Wallet {
    if (initialBalance < 0n) {
      throw new InvalidAmountError();
    }
    return new Wallet(playerId, initialBalance);
  }

  static rehydrate(
    playerId: string,
    balance: bigint,
    ledger: LedgerEntry[] = [],
  ): Wallet {
    return new Wallet(playerId, balance, [...ledger]);
  }

  get balance(): bigint {
    return this._balance;
  }

  get ledger(): readonly LedgerEntry[] {
    return this._ledger;
  }

  credit(amountCents: bigint, reference: string): void {
    const amount = MoneyCents.of(amountCents).amount;
    this.assertUniqueReference(reference);
    this._balance += amount;
    this._ledger.push(LedgerEntry.credit(amount, reference));
  }

  debit(amountCents: bigint, reference: string): void {
    const amount = MoneyCents.of(amountCents).amount;
    this.assertUniqueReference(reference);
    if (this._balance < amount) {
      throw new InsufficientBalanceError();
    }
    this._balance -= amount;
    this._ledger.push(LedgerEntry.debit(amount, reference));
  }

  private assertUniqueReference(reference: string): void {
    if (this._ledger.some((entry) => entry.reference === reference)) {
      throw new DuplicateReferenceError(reference);
    }
  }
}
