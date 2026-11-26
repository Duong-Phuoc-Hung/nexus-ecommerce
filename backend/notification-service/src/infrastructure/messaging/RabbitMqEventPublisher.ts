import crypto from 'node:crypto';
import { IEventPublisher } from '../../application/ports/IEventPublisher';
import { ISubscribableEventPublisher } from '../../application/listeners/GlobalEventAuditSubscriber';

type EventHandler = (event: any) => Promise<void> | void;

export class RabbitMqEventPublisher implements IEventPublisher, ISubscribableEventPublisher {
  private readonly listeners = new Map<string, Set<EventHandler>>();

  public subscribe(eventType: string, handler: EventHandler): () => void {
    const key = eventType || '*';
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(handler);
    return () => {
      this.listeners.get(key)?.delete(handler);
    };
  }

  public async publish<T>(
    eventName: string,
    payload: T,
    sourceService = 'notification-service',
  ): Promise<void> {
    const envelope = {
      eventId:
        (payload as any)?.eventId && typeof (payload as any).eventId === 'string'
          ? (payload as any).eventId
          : `evt_${crypto.randomUUID()}`,
      type: eventName,
      sourceService:
        (payload as any)?.sourceService && typeof (payload as any).sourceService === 'string'
          ? (payload as any).sourceService
          : sourceService,
      payload,
      occurredAt: new Date().toISOString(),
    };

    console.log(`[RabbitMQ Event Dispatched] Event: "${eventName}"`, JSON.stringify(payload));

    const handlers = [...(this.listeners.get(eventName) ?? []), ...(this.listeners.get('*') ?? [])];

    for (const handler of handlers) {
      try {
        await handler(envelope);
      } catch (err) {
        console.error(`[RabbitMqEventPublisher] Subscriber error for "${eventName}":`, err);
      }
    }
  }
}
