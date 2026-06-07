import { Pool } from 'pg';
import { ProcessedEventRepository } from '../../application/ports/processed-event.repository';

export class PostgresProcessedEventRepository implements ProcessedEventRepository {
  constructor(private readonly pool: Pool) {}

  async exists(eventId: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM processed_events WHERE event_id = $1',
      [eventId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async markProcessed(eventId: string): Promise<void> {
    await this.pool.query(
      'INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [eventId],
    );
  }
}
