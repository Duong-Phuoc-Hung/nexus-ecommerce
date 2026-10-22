export interface ProductUpdatedEventPayload {
  productId: string;
  sellerId: string;
  title: string;
  price: number;
  stockQuantity: number;
  status: string;
  timestamp: string;
}

export class ProductUpdatedEvent {
  public static readonly EVENT_NAME = 'catalog.product.updated';

  public readonly eventName: string = ProductUpdatedEvent.EVENT_NAME;
  public readonly occurredOn: Date = new Date();

  constructor(public readonly payload: ProductUpdatedEventPayload) {}
}
