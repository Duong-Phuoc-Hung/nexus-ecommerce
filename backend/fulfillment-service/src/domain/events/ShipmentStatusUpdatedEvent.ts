export interface ShipmentStatusUpdatedEventPayload {
  shipmentId: string;
  orderId: string;
  status: string;
  trackingCode: string;
  timestamp: string;
}

export class ShipmentStatusUpdatedEvent {
  public static readonly EVENT_NAME = 'fulfillment.status.updated';

  public readonly eventName: string = ShipmentStatusUpdatedEvent.EVENT_NAME;
  public readonly occurredOn: Date = new Date();

  constructor(public readonly payload: ShipmentStatusUpdatedEventPayload) {}
}
