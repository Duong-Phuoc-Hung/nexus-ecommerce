/**
 * =============================================================================
 * PROJECT NEXUS - IN-MEMORY EVENT LOG REPOSITORY (SCRUM-58, SCRUM-60)
 * =============================================================================
 * Bộ nhớ tạm giả lập bảng notification_event_log cho Unit Test và CI nhanh.
 * =============================================================================
 */

import { EventLog } from '../../domain/entities/EventLog';
import { IEventLogRepository } from '../../domain/repositories/IEventLogRepository';

export class InMemoryEventLogRepository implements IEventLogRepository {
  private logs: Map<string, EventLog> = new Map(); // key = eventId
  private autoIncrementId = 1;

  public async save(eventLog: EventLog): Promise<EventLog> {
    // Xử lý Idempotency: Nếu eventId đã tồn tại, trả về bản ghi hiện tại mà không chèn trùng lặp
    const existing = this.logs.get(eventLog.eventId);
    if (existing) {
      return existing;
    }

    const savedLog = new EventLog({
      id: eventLog.id || BigInt(this.autoIncrementId++),
      eventId: eventLog.eventId,
      type: eventLog.type,
      sourceService: eventLog.sourceService,
      payload: eventLog.payload,
      status: eventLog.status,
      createdAt: eventLog.createdAt,
    });

    this.logs.set(savedLog.eventId, savedLog);
    return savedLog;
  }

  public async findByEventId(eventId: string): Promise<EventLog | null> {
    return this.logs.get(eventId) || null;
  }

  public async findRecent(limit = 50): Promise<EventLog[]> {
    const all = Array.from(this.logs.values());
    // Sắp xếp giảm dần theo createdAt
    all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return all.slice(0, limit);
  }

  public async findByType(type: string): Promise<EventLog[]> {
    return Array.from(this.logs.values()).filter((l) => l.type === type);
  }

  public async findBySourceService(sourceService: string): Promise<EventLog[]> {
    return Array.from(this.logs.values()).filter((l) => l.sourceService === sourceService);
  }

  public count(): number {
    return this.logs.size;
  }

  public clear(): void {
    this.logs.clear();
    this.autoIncrementId = 1;
  }
}
