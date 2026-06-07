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

export class InvalidMultiplierError extends DomainError {
  constructor() {
    super('Multiplier must be at least 1.00x');
  }
}

export class BetLimitError extends DomainError {
  constructor() {
    super('Bet amount is outside allowed limits');
  }
}

export class InvalidRoundStateError extends DomainError {
  constructor(action: string, status: string) {
    super(`Cannot ${action} while round is ${status}`);
  }
}

export class DuplicateBetError extends DomainError {
  constructor(playerId: string) {
    super(`Player ${playerId} already has a bet in this round`);
  }
}

export class BetNotFoundError extends DomainError {
  constructor(playerId: string) {
    super(`No bet found for player ${playerId}`);
  }
}

export class BetAlreadyCashedOutError extends DomainError {
  constructor() {
    super('Bet has already been cashed out');
  }
}

export class RoundNotFoundError extends DomainError {
  constructor(roundId: string) {
    super(`Round not found: ${roundId}`);
  }
}

export class NoActiveRoundError extends DomainError {
  constructor() {
    super('No active round available');
  }
}
