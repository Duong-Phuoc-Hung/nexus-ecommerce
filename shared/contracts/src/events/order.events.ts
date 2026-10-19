/**
 * =============================================================================
 * PROJECT NEXUS - COMMERCE, CART & ORDER DOMAIN EVENTS (SRS 2.8 & SCRUM-37)
 * =============================================================================
 * Danh mục hợp đồng sự kiện thuộc Bounded Context Commerce (commerce-service).
 * =============================================================================
 */

import { DomainEvent, DomainEventInitOptions } from './domain-event.base';

export interface OrderItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderCreatedPayload {
  orderId: string;
  buyerId: string;
  totalAmount: number;
  items: OrderItemPayload[];
  createdAt: string;
}

export class OrderCreatedDomainEvent extends DomainEvent<OrderCreatedPayload> {
  public static readonly EVENT_TYPE = 'order.created';

  constructor(
    payload: OrderCreatedPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<OrderCreatedPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: OrderCreatedDomainEvent.EVENT_TYPE,
      sourceService: 'commerce-service',
      payload,
    });
  }
}

export interface OrderPaidPayload {
  orderId: string;
  buyerId: string;
  paymentId: string;
  amountPaid: number;
  paymentMethod: string;
  paidAt: string;
}

export class OrderPaidDomainEvent extends DomainEvent<OrderPaidPayload> {
  public static readonly EVENT_TYPE = 'order.paid';

  constructor(
    payload: OrderPaidPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<OrderPaidPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: OrderPaidDomainEvent.EVENT_TYPE,
      sourceService: 'commerce-service',
      payload,
    });
  }
}

export interface OrderCancelledPayload {
  orderId: string;
  buyerId: string;
  reason: string;
  cancelledAt: string;
}

export class OrderCancelledDomainEvent extends DomainEvent<OrderCancelledPayload> {
  public static readonly EVENT_TYPE = 'order.cancelled';

  constructor(
    payload: OrderCancelledPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<OrderCancelledPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: OrderCancelledDomainEvent.EVENT_TYPE,
      sourceService: 'commerce-service',
      payload,
    });
  }
}

export interface CartItemAddedPayload {
  userId: string;
  productId: string;
  quantity: number;
  addedAt: string;
}

export class CartItemAddedDomainEvent extends DomainEvent<CartItemAddedPayload> {
  public static readonly EVENT_TYPE = 'cart.item_added';

  constructor(
    payload: CartItemAddedPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<CartItemAddedPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: CartItemAddedDomainEvent.EVENT_TYPE,
      sourceService: 'commerce-service',
      payload,
    });
  }
}

export interface CheckoutStartedPayload {
  userId: string;
  cartId: string;
  totalEstimatedAmount: number;
  startedAt: string;
}

export class CheckoutStartedDomainEvent extends DomainEvent<CheckoutStartedPayload> {
  public static readonly EVENT_TYPE = 'cart.checkout_started';

  constructor(
    payload: CheckoutStartedPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<CheckoutStartedPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: CheckoutStartedDomainEvent.EVENT_TYPE,
      sourceService: 'commerce-service',
      payload,
    });
  }
}
