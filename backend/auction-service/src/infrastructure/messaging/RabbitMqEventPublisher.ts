import { IEventPublisher } from '../../application/ports/IEventPublisher';

export interface PublishedEventRecord<T = any> {
  eventName: string;
  payload: T;
  publishedAt: Date;
}

export class RabbitMqEventPublisher implements IEventPublisher {
  public readonly events: PublishedEventRecord[] = [];

  public async publish<T>(eventName: string, payload: T): Promise<void> {
    this.events.push({
      eventName,
      payload,
      publishedAt: new Date(),
    });
    console.log(`[RabbitMQ Event Dispatched] Event: "${eventName}"`, JSON.stringify(payload));
  }

  public getPublishedEvents(): PublishedEventRecord[] {
    return [...this.events];
  }

  public clear(): void {
    this.events.length = 0;
  }
}
