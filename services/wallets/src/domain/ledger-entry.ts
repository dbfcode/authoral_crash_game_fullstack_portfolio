export enum LedgerEntryType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export class LedgerEntry {
  private constructor(
    readonly type: LedgerEntryType,
    readonly amountCents: bigint,
    readonly reference: string,
    readonly createdAt: Date,
  ) {}

  static credit(amountCents: bigint, reference: string): LedgerEntry {
    return new LedgerEntry(
      LedgerEntryType.CREDIT,
      amountCents,
      reference,
      new Date(),
    );
  }

  static debit(amountCents: bigint, reference: string): LedgerEntry {
    return new LedgerEntry(
      LedgerEntryType.DEBIT,
      amountCents,
      reference,
      new Date(),
    );
  }

  static rehydrate(
    type: LedgerEntryType,
    amountCents: bigint,
    reference: string,
    createdAt: Date,
  ): LedgerEntry {
    return new LedgerEntry(type, amountCents, reference, createdAt);
  }
}
