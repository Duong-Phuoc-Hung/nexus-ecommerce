/**
 * =============================================================================
 * PROJECT NEXUS - EVENT LOG APPLICATION SERVICE (SCRUM-58, SCRUM-59)
 * =============================================================================
 * Dịch vụ tiếp nhận sự kiện và ghi vào nhật ký kiểm toán (EventLog).
 * Quản lý Idempotency và cơ chế xử lý lỗi theo ADR-002.
 * =============================================================================
 */

import { EventLog } from '../../domain/entities/EventLog';
import { IEventLogRepository } from '../../domain/repositories/IEventLogRepository';

export interface RecordEventInput {
  eventId: string;
  type: string;
  sourceService: string;
  payload: any;
  occurredAt?: string;
  status?: string;
}

export class EventLogService {
  constructor(
    private readonly repository: IEventLogRepository,
    private readonly logger: (msg: string, err?: Error) => void = (msg) =>
      console.log(`[EventLogService] ${msg}`),
  ) {}

  /**
   * Tiếp nhận DomainEvent và ghi vào bảng nhật ký kiểm toán
   * Đảm bảo tính chất Idempotent (không tạo bản ghi trùng lặp khi nhận lại cùng 1 eventId)
   */
  public async recordEvent(input: RecordEventInput): Promise<EventLog> {
    try {
      if (!input || !input.eventId || !input.type || !input.sourceService) {
        throw new Error(
          '[EventLogService Error] Dữ liệu sự kiện đầu vào không hợp lệ (thiếu eventId, type hoặc sourceService).',
        );
      }

      // 1. Kiểm tra Idempotency
      const existing = await this.repository.findByEventId(input.eventId);
      if (existing) {
        this.logger(
          `[Idempotent Ignore] Bỏ qua sự kiện trùng lặp đã tồn tại trong event_log (eventId: ${input.eventId})`,
        );
        return existing;
      }

      // 2. Tạo thực thể kiểm toán mới
      const eventLog = new EventLog({
        eventId: input.eventId,
        type: input.type,
        sourceService: input.sourceService,
        payload: input.payload,
        status: input.status || 'SUCCESS',
        createdAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
      });

      // 3. Lưu vào kho lưu trữ
      const saved = await this.repository.save(eventLog);
      this.logger(
        `[Audit Recorded] Đã lưu thành công sự kiện "${saved.type}" từ "${saved.sourceService}" (id: ${saved.eventId})`,
      );
      return saved;
    } catch (error) {
      // 4. Cơ chế xử lý lỗi theo ADR-002 (Không nuốt lỗi im lặng)
      this.logger(
        `[Audit Persistence Failed] Không thể lưu event_log cho eventId: ${input?.eventId}: ${(error as Error).message}`,
        error as Error,
      );
      throw error;
    }
  }

  /**
   * Truy vấn các sự kiện đã ghi nhận
   */
  public async getRecentLogs(limit = 50): Promise<EventLog[]> {
    return this.repository.findRecent(limit);
  }

  public async getLogByEventId(eventId: string): Promise<EventLog | null> {
    return this.repository.findByEventId(eventId);
  }
}
