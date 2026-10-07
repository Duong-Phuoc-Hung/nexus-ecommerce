export interface ProductCreatedEventPayload {
  productId: string;
  sellerId: string;
  title: string;
  price: number;
  stockQuantity: number;
  timestamp: string;
}

export class ProductCreatedEvent {
  public static readonly EVENT_NAME = 'catalog.product.created';

  public readonly eventName: string = ProductCreatedEvent.EVENT_NAME;
  public readonly occurredOn: Date = new Date();

  constructor(public readonly payload: ProductCreatedEventPayload) {}
}
