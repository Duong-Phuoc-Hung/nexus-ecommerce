export enum ShipmentStatus {
  READY_TO_PICK = 'READY_TO_PICK',
  PICKED = 'PICKED',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETURNED = 'RETURNED',
}

export enum CarrierCode {
  GHN = 'GHN',
  GHTK = 'GHTK',
  VNPOST = 'VNPOST',
}

export interface ShipmentProps {
  id: string;
  orderId: string;
  carrier: CarrierCode;
  trackingCode: string;
  status: ShipmentStatus;
  shippingAddress: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Domain Entity: Shipment
 * Quản lý vòng đời vận chuyển và tích hợp đơn vị vận chuyển (SRS 3.6).
 */
export class Shipment {
  private readonly _id: string;
  private readonly _orderId: string;
  private readonly _carrier: CarrierCode;
  private _trackingCode: string;
  private _status: ShipmentStatus;
  private readonly _shippingAddress: string;
  private _estimatedDeliveryDate?: Date;
  private _actualDeliveryDate?: Date;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: ShipmentProps) {
    this._id = props.id;
    this._orderId = props.orderId;
    this._carrier = props.carrier;
    this._trackingCode = props.trackingCode;
    this._status = props.status;
    this._shippingAddress = props.shippingAddress;
    this._estimatedDeliveryDate = props.estimatedDeliveryDate;
    this._actualDeliveryDate = props.actualDeliveryDate;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get id(): string {
    return this._id;
  }

  public get orderId(): string {
    return this._orderId;
  }

  public get carrier(): CarrierCode {
    return this._carrier;
  }

  public get trackingCode(): string {
    return this._trackingCode;
  }

  public get status(): ShipmentStatus {
    return this._status;
  }

  public get shippingAddress(): string {
    return this._shippingAddress;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public updateStatus(newStatus: ShipmentStatus): void {
    this._status = newStatus;
    if (newStatus === ShipmentStatus.DELIVERED) {
      this._actualDeliveryDate = new Date();
    }
    this._updatedAt = new Date();
  }
}
