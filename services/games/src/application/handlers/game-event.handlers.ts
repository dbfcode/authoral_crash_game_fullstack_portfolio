import {
  BetRejectedPayload,
  BetReservedPayload,
  CashoutPaidPayload,
  CashoutRejectedPayload,
  EventEnvelope,
  EventType,
} from '@crash/shared';

export class GameEventHandlers {
  private readonly events: EventEnvelope[] = [];

  handle(type: EventType, envelope: EventEnvelope): void {
    this.events.push({ ...envelope, type });
  }

  getEvents(): readonly EventEnvelope[] {
    return this.events;
  }

  getLastBetReserved(): BetReservedPayload | null {
    const event = [...this.events]
      .reverse()
      .find((item) => item.type === 'BetReserved');
    return (event?.payload as BetReservedPayload) ?? null;
  }

  getLastBetRejected(): BetRejectedPayload | null {
    const event = [...this.events]
      .reverse()
      .find((item) => item.type === 'BetRejected');
    return (event?.payload as BetRejectedPayload) ?? null;
  }

  getLastCashoutPaid(): CashoutPaidPayload | null {
    const event = [...this.events]
      .reverse()
      .find((item) => item.type === 'CashoutPaid');
    return (event?.payload as CashoutPaidPayload) ?? null;
  }

  getLastCashoutRejected(): CashoutRejectedPayload | null {
    const event = [...this.events]
      .reverse()
      .find((item) => item.type === 'CashoutRejected');
    return (event?.payload as CashoutRejectedPayload) ?? null;
  }

  clear(): void {
    this.events.length = 0;
  }
}
