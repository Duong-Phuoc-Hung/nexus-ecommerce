import { IEventPublisher } from '../../application/ports/IEventPublisher';

/**
 * Infrastructure Messaging: RabbitMqEventPublisher
 * Triển khai gửi sự kiện ra RabbitMQ Broker theo Event Message Table (SRS 2.8).
 * Khung sườn skeleton sẵn sàng kết nối amqplib.
 */
export class RabbitMqEventPublisher implements IEventPublisher {
  public async publish<T>(eventName: string, payload: T): Promise<void> {
    // Skeleton: Ghi log sự kiện phát hành. Phase sau sẽ kết nối AMQP channel.
    console.log(`[RabbitMQ Event Dispatched] Event: "${eventName}"`, JSON.stringify(payload));
  }
}
