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
  VIETTEL_POST = 'VIETTEL_POST',
}

export interface ShipmentProps {
  id: string;
  orderId: string;
  carrier: CarrierCode;
  trackingCode: string;
  status: ShipmentStatus;
  shippingAddress: string;
  recipientName?: string;
  recipientPhone?: string;
  city?: string;
  currentLocation?: string;
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
  private _carrier: CarrierCode;
  private _trackingCode: string;
  private _status: ShipmentStatus;
  private _shippingAddress: string;
  private _recipientName: string;
  private _recipientPhone: string;
  private _city: string;
  private _currentLocation: string;
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
    this._recipientName = props.recipientName || 'Người nhận';
    this._recipientPhone = props.recipientPhone || '';
    this._city = props.city || 'TP. Hồ Chí Minh';
    this._currentLocation = props.currentLocation || `${this._city} · Trung tâm phân loại`;
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

  public get recipientName(): string {
    return this._recipientName;
  }

  public get recipientPhone(): string {
    return this._recipientPhone;
  }

  public get city(): string {
    return this._city;
  }

  public get currentLocation(): string {
    return this._currentLocation;
  }

  public get estimatedDeliveryDate(): Date | undefined {
    return this._estimatedDeliveryDate;
  }

  public get actualDeliveryDate(): Date | undefined {
    return this._actualDeliveryDate;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public updateStatus(newStatus: ShipmentStatus, location?: string): void {
    this._status = newStatus;
    if (newStatus === ShipmentStatus.DELIVERED) {
      this._actualDeliveryDate = new Date();
    }
    if (location) {
      this._currentLocation = location;
    }
    this._updatedAt = new Date();
  }

  public manualOverride(params: {
    carrier?: CarrierCode;
    trackingCode?: string;
    shippingAddress?: string;
    city?: string;
    status?: ShipmentStatus;
  }): void {
    if (params.carrier) this._carrier = params.carrier;
    if (params.trackingCode) this._trackingCode = params.trackingCode;
    if (params.shippingAddress) this._shippingAddress = params.shippingAddress;
    if (params.city) this._city = params.city;
    if (params.status) this._status = params.status;
    this._updatedAt = new Date();
  }
}
