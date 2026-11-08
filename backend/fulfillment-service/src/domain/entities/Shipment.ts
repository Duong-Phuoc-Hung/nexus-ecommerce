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
  redeliveryAttempts?: number;
  rescheduledDate?: Date;
  returnedToSellerAt?: Date;
  returnCondition?: 'INTACT' | 'DAMAGED' | 'LOST';
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
  private _redeliveryAttempts: number;
  private _rescheduledDate?: Date;
  private _returnedToSellerAt?: Date;
  private _returnCondition?: 'INTACT' | 'DAMAGED' | 'LOST';
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
    this._redeliveryAttempts = props.redeliveryAttempts || 0;
    this._rescheduledDate = props.rescheduledDate;
    this._returnedToSellerAt = props.returnedToSellerAt;
    this._returnCondition = props.returnCondition;
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

  public get redeliveryAttempts(): number {
    return this._redeliveryAttempts;
  }

  public get rescheduledDate(): Date | undefined {
    return this._rescheduledDate;
  }

  public get returnedToSellerAt(): Date | undefined {
    return this._returnedToSellerAt;
  }

  public get returnCondition(): 'INTACT' | 'DAMAGED' | 'LOST' | undefined {
    return this._returnCondition;
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

  /**
   * Yêu cầu đơn vị vận chuyển phát lại lần nữa khi đơn giao thất bại (SRS 3.6 - Failed Delivery & RTO)
   */
  public requestRedelivery(params: {
    carrierCode?: CarrierCode;
    rescheduledDate: Date;
    note?: string;
  }): void {
    if (this._redeliveryAttempts >= 3) {
      throw new Error(
        `Đơn hàng đã phát lại tối đa 3 lần (${this._redeliveryAttempts}/3). Vui lòng chuyển hoàn về người bán.`,
      );
    }

    if (params.carrierCode) {
      this._carrier = params.carrierCode;
    }
    this._redeliveryAttempts += 1;
    this._rescheduledDate = params.rescheduledDate;
    this._status = ShipmentStatus.OUT_FOR_DELIVERY;

    const formattedDate = params.rescheduledDate.toISOString().split('T')[0];
    this._currentLocation = `Bưu cục ${this._city} · Đã lên lịch phát lại lần ${this._redeliveryAttempts} vào ngày ${formattedDate}${
      params.note ? ` (Ghi chú: ${params.note})` : ''
    }`;
    this._updatedAt = new Date();
  }

  /**
   * Xác nhận đơn giao thất bại đã hoàn về kho Người bán thành công để đóng hồ sơ vận đơn
   */
  public confirmReturn(params: {
    returnedToSellerAt: Date;
    condition: 'INTACT' | 'DAMAGED' | 'LOST';
  }): void {
    this._status = ShipmentStatus.RETURNED;
    this._returnedToSellerAt = params.returnedToSellerAt;
    this._returnCondition = params.condition;

    const conditionText =
      params.condition === 'INTACT'
        ? 'Hàng nguyên vẹn'
        : params.condition === 'DAMAGED'
          ? 'Hàng bị hư hỏng bể vỡ'
          : 'Hàng bị thất lạc';

    this._currentLocation = `Đã hoàn trả thành công về kho người bán · Hiện trạng: ${conditionText}`;
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
