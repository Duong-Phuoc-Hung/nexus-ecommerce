import { Pool } from 'pg';
import { EventLog } from '../../domain/entities/EventLog';
import { IEventLogRepository } from '../../domain/repositories/IEventLogRepository';

export class PostgresEventLogRepository implements IEventLogRepository {
  constructor(private readonly pool: Pool) {}

  public async save(eventLog: EventLog): Promise<EventLog> {
    const { rows } = await this.pool.query(
      `INSERT INTO notification_event_log (event_id, type, source_service, payload, status, created_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING id::text, event_id, type, source_service, payload, status, created_at`,
      [
        eventLog.eventId,
        eventLog.type,
        eventLog.sourceService,
        JSON.stringify(eventLog.payload ?? {}),
        eventLog.status || 'SUCCESS',
        eventLog.createdAt,
      ],
    );

    if (rows.length === 0) {
      const existing = await this.findByEventId(eventLog.eventId);
      return existing ?? eventLog;
    }

    return this.mapRow(rows[0]);
  }

  public async findByEventId(eventId: string): Promise<EventLog | null> {
    const { rows } = await this.pool.query(
      `SELECT id::text, event_id, type, source_service, payload, status, created_at
       FROM notification_event_log
       WHERE event_id = $1
       LIMIT 1`,
      [eventId],
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  public async findRecent(limit = 50): Promise<EventLog[]> {
    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
    const { rows } = await this.pool.query(
      `SELECT id::text, event_id, type, source_service, payload, status, created_at
       FROM notification_event_log
       ORDER BY created_at DESC, id DESC
       LIMIT $1`,
      [safeLimit],
    );
    return rows.map((r) => this.mapRow(r));
  }

  public async findByType(type: string): Promise<EventLog[]> {
    const { rows } = await this.pool.query(
      `SELECT id::text, event_id, type, source_service, payload, status, created_at
       FROM notification_event_log
       WHERE type = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 100`,
      [type],
    );
    return rows.map((r) => this.mapRow(r));
  }

  public async findBySourceService(sourceService: string): Promise<EventLog[]> {
    const { rows } = await this.pool.query(
      `SELECT id::text, event_id, type, source_service, payload, status, created_at
       FROM notification_event_log
       WHERE source_service = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 100`,
      [sourceService],
    );
    return rows.map((r) => this.mapRow(r));
  }

  private mapRow(row: any): EventLog {
    return new EventLog({
      id: String(row.id),
      eventId: String(row.event_id),
      type: String(row.type),
      sourceService: String(row.source_service),
      payload: row.payload,
      status: String(row.status || 'SUCCESS'),
      createdAt: new Date(row.created_at),
    });
  }
}
