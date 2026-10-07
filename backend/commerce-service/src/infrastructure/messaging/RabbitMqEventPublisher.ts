import { IEventPublisher } from '../../application/ports/IEventPublisher';

export class RabbitMqEventPublisher implements IEventPublisher {
  public async publish<T>(eventName: string, payload: T): Promise<void> {
    console.log(`[RabbitMQ Event Dispatched] Event: "${eventName}"`, JSON.stringify(payload));
  }
}
