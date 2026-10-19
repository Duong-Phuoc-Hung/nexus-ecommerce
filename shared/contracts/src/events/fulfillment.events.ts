/**
 * =============================================================================
 * PROJECT NEXUS - FULFILLMENT, INVENTORY & SHIPPING DOMAIN EVENTS (SRS 2.8 & SCRUM-37)
 * =============================================================================
 * Danh mục hợp đồng sự kiện thuộc Bounded Context Fulfillment (fulfillment-service).
 * =============================================================================
 */

import { DomainEvent, DomainEventInitOptions } from './domain-event.base';

export interface InventoryReservedPayload {
  orderId: string;
  items: Array<{ productId: string; quantity: number }>;
  expiresAt: string;
  reservedAt: string;
}

export class InventoryReservedDomainEvent extends DomainEvent<InventoryReservedPayload> {
  public static readonly EVENT_TYPE = 'inventory.reserved';

  constructor(
    payload: InventoryReservedPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<InventoryReservedPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: InventoryReservedDomainEvent.EVENT_TYPE,
      sourceService: 'fulfillment-service',
      payload,
    });
  }
}

export interface InventoryReleasedPayload {
  orderId: string;
  reason: string;
  releasedAt: string;
}

export class InventoryReleasedDomainEvent extends DomainEvent<InventoryReleasedPayload> {
  public static readonly EVENT_TYPE = 'inventory.released';

  constructor(
    payload: InventoryReleasedPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<InventoryReleasedPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: InventoryReleasedDomainEvent.EVENT_TYPE,
      sourceService: 'fulfillment-service',
      payload,
    });
  }
}

export interface ShipmentCreatedPayload {
  shipmentId: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  shippingAddress: string;
  createdAt: string;
}

export class ShipmentCreatedDomainEvent extends DomainEvent<ShipmentCreatedPayload> {
  public static readonly EVENT_TYPE = 'shipment.created';

  constructor(
    payload: ShipmentCreatedPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<ShipmentCreatedPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: ShipmentCreatedDomainEvent.EVENT_TYPE,
      sourceService: 'fulfillment-service',
      payload,
    });
  }
}

export interface ShipmentStatusUpdatedPayload {
  shipmentId: string;
  orderId: string;
  oldStatus: string;
  newStatus: string;
  currentLocation?: string;
  updatedAt: string;
}

export class ShipmentStatusUpdatedDomainEvent extends DomainEvent<ShipmentStatusUpdatedPayload> {
  public static readonly EVENT_TYPE = 'shipment.status_updated';

  constructor(
    payload: ShipmentStatusUpdatedPayload,
    options?: Partial<
      Omit<
        DomainEventInitOptions<ShipmentStatusUpdatedPayload>,
        'type' | 'sourceService' | 'payload'
      >
    >,
  ) {
    super({
      ...options,
      type: ShipmentStatusUpdatedDomainEvent.EVENT_TYPE,
      sourceService: 'fulfillment-service',
      payload,
    });
  }
}
