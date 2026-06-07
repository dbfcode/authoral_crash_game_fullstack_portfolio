import { EventType } from './event-types';

export interface EventEnvelope<TType extends EventType = EventType, TPayload = unknown> {
  eventId: string;
  correlationId: string;
  type: TType;
  timestamp: string;
  payload: TPayload;
}

export function createEnvelope<TType extends EventType, TPayload>(
  type: TType,
  payload: TPayload,
  options?: { eventId?: string; correlationId?: string; timestamp?: string },
): EventEnvelope<TType, TPayload> {
  return {
    eventId: options?.eventId ?? crypto.randomUUID(),
    correlationId: options?.correlationId ?? crypto.randomUUID(),
    type,
    timestamp: options?.timestamp ?? new Date().toISOString(),
    payload,
  };
}
