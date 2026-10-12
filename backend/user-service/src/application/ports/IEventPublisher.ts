/**
 * Application Port: IEventPublisher
 * Cổng ra (Outbound Port) để Application phát tán Domain Event sang Message Broker (RabbitMQ).
 */
export interface IEventPublisher {
  publish<T>(eventName: string, payload: T): Promise<void>;
}
