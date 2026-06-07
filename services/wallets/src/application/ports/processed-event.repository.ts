export interface ProcessedEventRepository {
  exists(eventId: string): Promise<boolean>;
  markProcessed(eventId: string): Promise<void>;
}
