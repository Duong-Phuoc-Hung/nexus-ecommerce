export interface IEventPublisher {
  publish<T>(eventName: string, payload: T): Promise<void>;
}
