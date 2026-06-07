import { EventEnvelope } from '../events/envelope';
import { EventType, EventTypes } from '../events/event-types';

export function toCentsString(value: bigint | number): string {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (!Number.isInteger(value)) {
    throw new Error('Amount must be an integer in cents');
  }
  return String(value);
}

export function parseCents(value: string): bigint {
  if (!/^-?\d+$/.test(value)) {
    throw new Error('Invalid cents string');
  }
  return BigInt(value);
}

export function serializeEnvelope(envelope: EventEnvelope): string {
  return JSON.stringify(envelope);
}

export function parseEnvelope(raw: string): EventEnvelope {
  const parsed = JSON.parse(raw) as EventEnvelope;
  if (
    !parsed.eventId ||
    !parsed.correlationId ||
    !parsed.type ||
    !parsed.timestamp ||
    parsed.payload === undefined
  ) {
    throw new Error('Invalid event envelope');
  }
  return parsed;
}

export function isEventType(value: string): value is EventType {
  return (Object.values(EventTypes) as string[]).includes(value);
}
