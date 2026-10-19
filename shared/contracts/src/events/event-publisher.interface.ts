/**
 * =============================================================================
 * PROJECT NEXUS - EVENT PUBLISHER PORT INTERFACE (SCRUM-36)
 * =============================================================================
 * Cổng ra (Outbound Port) chuẩn hóa theo Kiến trúc Lục giác (Hexagonal / Ports & Adapters).
 * Tách biệt hoàn toàn tầng Nghiệp vụ (Application / Use Cases) khỏi thư viện AMQP,
 * RabbitMQ hoặc bất kỳ Message Broker hạ tầng nào.
 * =============================================================================
 */

import { IDomainEvent } from './domain-event.base';

/**
 * Lớp lỗi chuẩn hóa khi phát tán sự kiện thất bại
 */
export class EventPublishingError extends Error {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly cause?: Error;

  constructor(message: string, eventId: string, eventType: string, cause?: Error) {
    super(`[EventPublishingError] ${message} (eventId: ${eventId}, type: ${eventType})`);
    this.name = 'EventPublishingError';
    this.eventId = eventId;
    this.eventType = eventType;
    this.cause = cause;
    Object.setPrototypeOf(this, EventPublishingError.prototype);
  }
}

/**
 * Interface Outbound Port: IEventPublisher
 */
export interface IEventPublisher {
  /**
   * Phát hành một Domain Event đơn lẻ tới Message Broker hoặc bộ nhớ sự kiện
   * @param event Thể hiện của Domain Event cần phát tán
   */
  publish<T>(event: IDomainEvent<T>): Promise<void>;

  /**
   * Phát hành danh sách nhiều Domain Events theo lô (Batch Publishing)
   * @param events Danh sách các Domain Events cần phát tán
   */
  publishAll?(events: IDomainEvent<unknown>[]): Promise<void>;
}
