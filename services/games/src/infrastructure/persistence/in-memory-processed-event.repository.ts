import { ProcessedEventRepository } from '../../application/ports/processed-event.repository';

export class InMemoryProcessedEventRepository implements ProcessedEventRepository {
  private readonly processed = new Set<string>();

  async exists(eventId: string): Promise<boolean> {
    return this.processed.has(eventId);
  }

  async markProcessed(eventId: string): Promise<void> {
    this.processed.add(eventId);
  }
}
