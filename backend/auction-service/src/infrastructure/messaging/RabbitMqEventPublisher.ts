import { IEventPublisher } from '../../application/ports/IEventPublisher';

export interface PublishedEventRecord<T = any> {
  eventName: string;
  payload: T;
  publishedAt: Date;
  status: 'DISPATCHED' | 'QUEUED' | 'FALLBACK_LOGGED';
}

export class RabbitMqEventPublisher implements IEventPublisher {
  public readonly events: PublishedEventRecord[] = [];
  private connection: any = null;
  private channel: any = null;
  private isConnecting = false;

  constructor(private readonly brokerUrl = process.env.RABBITMQ_URL) {}

  private async ensureConnection(): Promise<any> {
    if (this.channel) return this.channel;
    if (!this.brokerUrl || this.isConnecting) return null;

    this.isConnecting = true;
    try {
      // Dynamic import to support environments with or without amqplib
      // @ts-ignore
      const amqp = await import('amqplib');
      this.connection = await amqp.connect(this.brokerUrl);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange('nexus.events', 'topic', { durable: true });
      this.isConnecting = false;
      return this.channel;
    } catch (err: any) {
      this.isConnecting = false;
      // Graceful fallback to in-process memory queue when broker is unreachable
      console.warn(
        `[RabbitMqEventPublisher] Broker unreachable at ${this.brokerUrl}, falling back to memory queue:`,
        err?.message || err,
      );
      return null;
    }
  }

  public async publish<T>(eventName: string, payload: T): Promise<void> {
    let status: 'DISPATCHED' | 'QUEUED' | 'FALLBACK_LOGGED' = 'FALLBACK_LOGGED';

    try {
      const ch = await this.ensureConnection();
      if (ch) {
        const messageBuffer = Buffer.from(
          JSON.stringify({ eventName, payload, timestamp: new Date() }),
        );
        ch.publish('nexus.events', eventName, messageBuffer, { persistent: true });
        status = 'DISPATCHED';
      }
    } catch (err: any) {
      console.warn(
        `[RabbitMqEventPublisher] Error publishing to exchange for "${eventName}":`,
        err?.message,
      );
    }

    this.events.push({
      eventName,
      payload,
      publishedAt: new Date(),
      status,
    });
    console.log(
      `[RabbitMQ Event Dispatched] Event: "${eventName}" (status: ${status})`,
      JSON.stringify(payload),
    );
  }

  public getPublishedEvents(): PublishedEventRecord[] {
    return [...this.events];
  }

  public clear(): void {
    this.events.length = 0;
  }
}
