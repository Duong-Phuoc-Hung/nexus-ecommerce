/**
 * =============================================================================
 * PROJECT NEXUS - EVENT LOG REPOSITORY INTERFACE (SCRUM-58)
 * =============================================================================
 */

import { EventLog } from '../entities/EventLog';

export interface IEventLogRepository {
  /**
   * Lưu bản ghi nhật ký sự kiện vào cơ sở dữ liệu
   */
  save(eventLog: EventLog): Promise<EventLog>;

  /**
   * Tìm kiếm bản ghi theo eventId duy nhất
   */
  findByEventId(eventId: string): Promise<EventLog | null>;

  /**
   * Lấy danh sách các sự kiện mới nhất phục vụ kiểm toán
   */
  findRecent(limit?: number): Promise<EventLog[]>;

  /**
   * Lọc sự kiện theo loại (type)
   */
  findByType(type: string): Promise<EventLog[]>;

  /**
   * Lọc sự kiện theo service phát hành (sourceService)
   */
  findBySourceService?(sourceService: string): Promise<EventLog[]>;
}
