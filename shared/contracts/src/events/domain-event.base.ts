/**
 * =============================================================================
 * PROJECT NEXUS - DOMAIN EVENT BASE CONTRACT & TYPE DEFINITIONS (SCRUM-35)
 * =============================================================================
 * Định nghĩa cấu trúc chuẩn hóa, bất biến (Immutable) cho toàn bộ các sự kiện
 * nghiệp vụ (Domain Events) phát sinh từ 7 Bounded Contexts theo SRS 2.8.
 * =============================================================================
 */

import { randomUUID } from 'crypto';

/**
 * Interface chuẩn cho mọi Domain Event trong hệ thống Nexus
 */
export interface IDomainEvent<T = unknown> {
  /**
   * Mã định danh duy nhất của sự kiện (UUID v4 hoặc tiền tố evt_*)
   */
  readonly eventId: string;

  /**
   * Tên loại sự kiện có phân cấp theo định dạng: <domain>.<entity>.<action>
   * Ví dụ: "user.account.registered", "catalog.product.created", "auction.bid.placed"
   */
  readonly type: string;

  /**
   * Phiên bản hợp đồng sự kiện (Schema Versioning). Mặc định là 1.
   */
  readonly version: number;

  /**
   * Thời điểm sự kiện phát sinh theo định dạng chuỗi chuẩn ISO-8601 UTC.
   */
  readonly occurredAt: string;

  /**
   * Tên Bounded Context / Microservice phát hành sự kiện.
   * Ví dụ: "user-service", "catalog-service", "auction-service"
   */
  readonly sourceService: string;

  /**
   * Mã liên kết luồng nghiệp vụ giữa các service (phục vụ Distributed Tracing).
   */
  readonly correlationId?: string;

  /**
   * Mã của sự kiện nguyên nhân dẫn tới sự kiện hiện tại (nếu có).
   */
  readonly causationId?: string;

  /**
   * Dữ liệu chi tiết của sự kiện (Payload bất biến).
   */
  readonly payload: T;
}

/**
 * Tham số đầu vào để khởi tạo một Domain Event
 */
export interface DomainEventInitOptions<T> {
  type: string;
  sourceService: string;
  payload: T;
  version?: number;
  eventId?: string;
  occurredAt?: string;
  correlationId?: string;
  causationId?: string;
}

/**
 * Lớp trừu tượng cơ sở (Abstract Base Class) cho mọi Domain Event.
 * Bắt buộc bảo toàn tính bất biến (Immutability) thông qua Object.freeze().
 */
export abstract class DomainEvent<T = unknown> implements IDomainEvent<T> {
  public readonly eventId: string;
  public readonly type: string;
  public readonly version: number;
  public readonly occurredAt: string;
  public readonly sourceService: string;
  public readonly correlationId?: string;
  public readonly causationId?: string;
  public readonly payload: T;

  constructor(options: DomainEventInitOptions<T>) {
    if (!options.type || typeof options.type !== 'string' || options.type.trim() === '') {
      throw new Error(
        '[DomainEvent Error] "type" bắt buộc phải là một chuỗi hợp lệ không được rỗng.',
      );
    }

    if (
      !options.sourceService ||
      typeof options.sourceService !== 'string' ||
      options.sourceService.trim() === ''
    ) {
      throw new Error(
        '[DomainEvent Error] "sourceService" bắt buộc phải là một chuỗi hợp lệ không được rỗng.',
      );
    }

    this.type = options.type;
    this.sourceService = options.sourceService;
    this.version = options.version !== undefined ? Number(options.version) : 1;
    this.eventId =
      options.eventId && options.eventId.trim() !== ''
        ? options.eventId
        : DomainEvent.generateEventId();
    this.occurredAt =
      options.occurredAt && options.occurredAt.trim() !== ''
        ? options.occurredAt
        : new Date().toISOString();
    this.correlationId = options.correlationId;
    this.causationId = options.causationId;

    // Đóng băng dữ liệu payload để đảm bảo tính bất biến (DDD Pure Domain)
    if (options.payload && typeof options.payload === 'object') {
      this.payload = Object.freeze({ ...options.payload });
    } else {
      this.payload = options.payload;
    }

    // Đóng băng toàn bộ thể hiện event (Object.freeze)
    Object.freeze(this);
  }

  /**
   * Sinh mã định danh sự kiện duy nhất (UUID v4)
   */
  public static generateEventId(): string {
    return randomUUID();
  }

  /**
   * Chuyển đổi sự kiện sang định dạng Plain Object chuẩn để serialization qua JSON hoặc AMQP
   */
  public toJSON(): IDomainEvent<T> {
    return {
      eventId: this.eventId,
      type: this.type,
      version: this.version,
      occurredAt: this.occurredAt,
      sourceService: this.sourceService,
      correlationId: this.correlationId,
      causationId: this.causationId,
      payload: this.payload,
    };
  }

  /**
   * Biểu diễn chuỗi định danh sự kiện phục vụ logging
   */
  public toString(): string {
    return `[DomainEvent:${this.type}] (id=${this.eventId}, source=${this.sourceService}, at=${this.occurredAt})`;
  }
}
