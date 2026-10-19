/**
 * =============================================================================
 * PROJECT NEXUS - GLOBAL EVENT AUDIT SUBSCRIBER (SCRUM-57, SCRUM-59)
 * =============================================================================
 * Listener chung lắng nghe MỌI sự kiện phát tán từ EventPublisher (wildcard: '*')
 * và tự động chuyển giao tới EventLogService để lưu vào bảng event_log.
 *
 * ĐẢM BẢO NGUYÊN TẮC:
 * 1. Các module nghiệp vụ (User, Catalog, Auction,...) chỉ việc publish event bình thường,
 *    hoàn toàn KHÔNG cần gọi hàm lưu log thủ công.
 * 2. Lỗi lưu log không làm crash tiến trình chính nhưng được ghi nhận đầy đủ (ADR-002).
 * =============================================================================
 */

import { EventLogService } from '../services/EventLogService';

/**
 * Interface tối thiểu của EventPublisher cần để đăng ký (Decoupled Port)
 */
export interface ISubscribableEventPublisher {
  subscribe(eventType: string, handler: (event: any) => Promise<void> | void): () => void;
}

export class GlobalEventAuditSubscriber {
  private unsubscribeFn?: () => void;

  constructor(
    private readonly eventLogService: EventLogService,
    private readonly logger: (msg: string, err?: Error) => void = (msg) =>
      console.log(`[GlobalEventAuditSubscriber] ${msg}`),
  ) {}

  /**
   * Đăng ký lắng nghe tự động mọi sự kiện từ EventPublisher
   * @param publisher Cổng phát sự kiện dùng chung
   * @returns Hàm hủy đăng ký
   */
  public register(publisher: ISubscribableEventPublisher): () => void {
    this.logger('Đang đăng ký Global Event Listener (wildcard: "*") để tự động ghi event_log...');

    // Đăng ký nhận mọi sự kiện (*)
    this.unsubscribeFn = publisher.subscribe('*', async (event: any) => {
      try {
        if (!event || !event.eventId || !event.type) {
          this.logger(
            '[Cảnh báo] Nhận sự kiện không hợp lệ từ EventPublisher (thiếu eventId/type).',
          );
          return;
        }

        // Tự động chuyển giao tới EventLogService để lưu vào DB
        await this.eventLogService.recordEvent({
          eventId: event.eventId,
          type: event.type,
          sourceService: event.sourceService || 'unknown-service',
          payload: event.payload,
          occurredAt: event.occurredAt,
        });
      } catch (err) {
        // Tuân thủ ADR-002: Lỗi ghi log được ghi nhận rõ ràng, không làm gián đoạn luồng phát sự kiện
        this.logger(
          `[Lỗi ghi Audit Log tự động] Sự kiện "${event?.type}" (id: ${event?.eventId}): ${(err as Error).message}`,
          err as Error,
        );
      }
    });

    return () => this.unregister();
  }

  /**
   * Hủy đăng ký listener
   */
  public unregister(): void {
    if (this.unsubscribeFn) {
      this.unsubscribeFn();
      this.unsubscribeFn = undefined;
      this.logger('Đã hủy đăng ký Global Event Listener.');
    }
  }
}
