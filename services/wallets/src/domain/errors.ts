export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidAmountError extends DomainError {
  constructor() {
    super('Amount must be a positive integer in cents');
  }
}

export class InsufficientBalanceError extends DomainError {
  constructor() {
    super('Insufficient balance');
  }
}

export class WalletAlreadyExistsError extends DomainError {
  constructor(playerId: string) {
    super(`Wallet already exists for player ${playerId}`);
  }
}

export class WalletNotFoundError extends DomainError {
  constructor(playerId: string) {
    super(`Wallet not found for player ${playerId}`);
  }
}

export class DuplicateReferenceError extends DomainError {
  constructor(reference: string) {
    super(`Duplicate ledger reference: ${reference}`);
  }
}
