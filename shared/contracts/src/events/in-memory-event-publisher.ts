/**
 * =============================================================================
 * PROJECT NEXUS - IN-MEMORY EVENT PUBLISHER ADAPTER (SCRUM-34, SCRUM-36)
 * =============================================================================
 * Bộ chuyển đổi phát sự kiện trong bộ nhớ (In-Memory Adapter).
 * Dùng cho Unit Testing, Fast CI và phát triển cục bộ không cần RabbitMQ.
 * =============================================================================
 */

import { IDomainEvent } from './domain-event.base';
import { IEventPublisher, EventPublishingError } from './event-publisher.interface';

export type EventHandler<T = unknown> = (event: IDomainEvent<T>) => Promise<void> | void;

export class InMemoryEventPublisher implements IEventPublisher {
  private events: IDomainEvent<unknown>[] = [];
  private handlers: Map<string, EventHandler<any>[]> = new Map();

  /**
   * Phát tán một sự kiện vào bộ nhớ và kích hoạt các handler đã đăng ký
   */
  public async publish<T>(event: IDomainEvent<T>): Promise<void> {
    if (!event || !event.eventId || !event.type) {
      throw new EventPublishingError(
        'Sự kiện không hợp lệ, thiếu eventId hoặc type.',
        event?.eventId || 'unknown',
        event?.type || 'unknown',
      );
    }

    // Lưu trữ sự kiện vào danh sách đã phát hành
    this.events.push(event);

    // Kích hoạt handlers đăng ký cho loại event cụ thể
    const specificHandlers = this.handlers.get(event.type) || [];
    // Kích hoạt handlers đăng ký cho wildcard '*'
    const wildcardHandlers = this.handlers.get('*') || [];

    const allHandlers = [...specificHandlers, ...wildcardHandlers];

    for (const handler of allHandlers) {
      try {
        await handler(event);
      } catch (err) {
        throw new EventPublishingError(
          `Lỗi khi thực thi handler cho sự kiện "${event.type}": ${(err as Error).message}`,
          event.eventId,
          event.type,
          err as Error,
        );
      }
    }
  }

  /**
   * Phát tán danh sách nhiều sự kiện theo lô
   */
  public async publishAll(events: IDomainEvent<unknown>[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Đăng ký một handler lắng nghe sự kiện
   * @param eventType Tên loại sự kiện (hoặc '*' để nhận toàn bộ)
   * @param handler Hàm callback xử lý sự kiện
   * @returns Hàm hủy đăng ký (unsubscribe)
   */
  public subscribe<T = unknown>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);

    // Trả về hàm hủy đăng ký
    return () => {
      const list = this.handlers.get(eventType);
      if (list) {
        const index = list.indexOf(handler);
        if (index !== -1) {
          list.splice(index, 1);
        }
      }
    };
  }

  /**
   * Lấy toàn bộ danh sách sự kiện đã phát hành (Read-only phục vụ Unit Test)
   */
  public getPublishedEvents(): ReadonlyArray<IDomainEvent<unknown>> {
    return [...this.events];
  }

  /**
   * Lọc danh sách sự kiện theo event type
   */
  public getEventsByType<T>(eventType: string): ReadonlyArray<IDomainEvent<T>> {
    return this.events.filter((e) => e.type === eventType) as IDomainEvent<T>[];
  }

  /**
   * Lấy sự kiện cuối cùng vừa phát hành
   */
  public getLastEvent<T = unknown>(): IDomainEvent<T> | undefined {
    return this.events[this.events.length - 1] as IDomainEvent<T> | undefined;
  }

  /**
   * Xóa sạch danh sách sự kiện và handlers (reset trạng thái giữa các test cases)
   */
  public clear(): void {
    this.events = [];
    this.handlers.clear();
  }
}
