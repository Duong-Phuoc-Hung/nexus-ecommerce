export interface OrderCreatedEventPayload {
  orderId: string;
  buyerId: string;
  totalAmount: number;
  itemsCount: number;
  timestamp: string;
}

export class OrderCreatedEvent {
  public static readonly EVENT_NAME = 'commerce.order.created';

  public readonly eventName: string = OrderCreatedEvent.EVENT_NAME;
  public readonly occurredOn: Date = new Date();

  constructor(public readonly payload: OrderCreatedEventPayload) {}
}
