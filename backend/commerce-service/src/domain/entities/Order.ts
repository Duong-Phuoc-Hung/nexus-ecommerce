export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUND_REQUESTED = 'REFUND_REQUESTED',
  REFUNDED = 'REFUNDED',
}

export interface OrderItem {
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderTimelineItem {
  status: string;
  title: string;
  timestamp: Date;
  note?: string;
}

export interface OrderProps {
  id: string;
  buyerId: string;
  buyerName?: string;
  buyerEmail?: string;
  sellerId: string;
  sellerName?: string;
  items: OrderItem[];
  subtotal?: number;
  shippingFee?: number;
  discountAmount?: number;
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    province?: string;
    district?: string;
    ward?: string;
    addressLine?: string;
    country?: string;
  };
  paymentMethod?: string;
  totalAmount: number;
  status: OrderStatus;
  paymentTransactionId?: string;
  trackingCode?: string;
  refundTransactionId?: string;
  refundAmount?: number;
  refundStatus?: 'PENDING' | 'SUCCESS' | 'FAILED';
  timeline?: OrderTimelineItem[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Domain Entity: Order
 * Đại diện cho đơn hàng trong Commerce Bounded Context (SRS 3.4).
 */
export class Order {
  private readonly _id: string;
  private readonly _buyerId: string;
  private readonly _buyerName: string;
  private readonly _buyerEmail: string;
  private readonly _sellerId: string;
  private readonly _sellerName: string;
  private _items: OrderItem[];
  private _subtotal: number;
  private _shippingFee: number;
  private _discountAmount: number;
  private _shippingAddress?: OrderProps['shippingAddress'];
  private _paymentMethod?: string;
  private _totalAmount: number;
  private _status: OrderStatus;
  private _paymentTransactionId?: string;
  private _trackingCode?: string;
  private _refundTransactionId?: string;
  private _refundAmount?: number;
  private _refundStatus?: 'PENDING' | 'SUCCESS' | 'FAILED';
  private _timeline: OrderTimelineItem[];
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: OrderProps) {
    this._id = props.id;
    this._buyerId = props.buyerId;
    this._buyerName = props.buyerName || 'Khách hàng';
    this._buyerEmail = props.buyerEmail || '';
    this._sellerId = props.sellerId;
    this._sellerName = props.sellerName || 'Gian hàng đối tác';
    this._items = props.items;
    this._shippingFee = props.shippingFee ?? 0;
    this._discountAmount = props.discountAmount ?? 0;
    this._subtotal = props.subtotal ?? props.totalAmount - this._shippingFee + this._discountAmount;
    this._shippingAddress = props.shippingAddress;
    this._paymentMethod = props.paymentMethod;
    this._totalAmount = props.totalAmount;
    this._status = props.status;
    this._paymentTransactionId = props.paymentTransactionId;
    this._trackingCode = props.trackingCode;
    this._refundTransactionId = props.refundTransactionId;
    this._refundAmount = props.refundAmount;
    this._refundStatus = props.refundStatus;
    this._timeline = props.timeline || [
      {
        status: 'CREATED',
        title: 'Đơn hàng được tạo thành công',
        timestamp: props.createdAt,
      },
    ];
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get id(): string {
    return this._id;
  }

  public get buyerId(): string {
    return this._buyerId;
  }

  public get buyerName(): string {
    return this._buyerName;
  }

  public get buyerEmail(): string {
    return this._buyerEmail;
  }

  public get sellerId(): string {
    return this._sellerId;
  }

  public get sellerName(): string {
    return this._sellerName;
  }

  public get items(): OrderItem[] {
    return [...this._items];
  }

  public get subtotal(): number {
    return this._subtotal;
  }

  public get shippingFee(): number {
    return this._shippingFee;
  }

  public get discountAmount(): number {
    return this._discountAmount;
  }

  public get shippingAddress(): OrderProps['shippingAddress'] {
    return this._shippingAddress;
  }

  public get paymentMethod(): string | undefined {
    return this._paymentMethod;
  }

  public get totalAmount(): number {
    return this._totalAmount;
  }

  public get status(): OrderStatus {
    return this._status;
  }

  public get paymentTransactionId(): string | undefined {
    return this._paymentTransactionId;
  }

  public get trackingCode(): string | undefined {
    return this._trackingCode;
  }

  public get refundTransactionId(): string | undefined {
    return this._refundTransactionId;
  }

  public get refundAmount(): number | undefined {
    return this._refundAmount;
  }

  public get refundStatus(): 'PENDING' | 'SUCCESS' | 'FAILED' | undefined {
    return this._refundStatus;
  }

  public get timeline(): OrderTimelineItem[] {
    return [...this._timeline];
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public markAsPaid(transactionId: string): void {
    if (this._status !== OrderStatus.PENDING) {
      throw new Error(`Cannot pay order in status "${this._status}"`);
    }
    this._status = OrderStatus.PAID;
    this._paymentTransactionId = transactionId;
    this._timeline.push({
      status: 'PAID',
      title: 'Đã xác nhận thanh toán',
      timestamp: new Date(),
    });
    this._updatedAt = new Date();
  }

  public updateStatus(status: OrderStatus, note?: string): void {
    this._status = status;
    this._timeline.push({
      status: String(status),
      title: `Trạng thái chuyển sang: ${status}`,
      timestamp: new Date(),
      note,
    });
    this._updatedAt = new Date();
  }

  public cancel(reason?: string): void {
    if (this._status === OrderStatus.DELIVERED) {
      throw new Error('Không thể hủy đơn hàng đã giao thành công.');
    }
    this._status = OrderStatus.CANCELLED;
    this._timeline.push({
      status: 'CANCELLED',
      title: 'Đơn hàng đã bị hủy bởi nhân viên hỗ trợ (Support Staff)',
      timestamp: new Date(),
      note: reason || 'Yêu cầu hủy từ người mua',
    });
    this._updatedAt = new Date();
  }

  public refund(reason?: string): void {
    if (
      this._status !== OrderStatus.PAID &&
      this._status !== OrderStatus.CANCELLED &&
      this._status !== OrderStatus.DELIVERED
    ) {
      throw new Error('Chỉ có thể hoàn tiền cho đơn hàng đã thanh toán.');
    }
    this._status = OrderStatus.REFUNDED;
    this._timeline.push({
      status: 'REFUNDED',
      title: 'Đã kích hoạt hoàn tiền cho khách hàng',
      timestamp: new Date(),
      note: reason || 'Xử lý hoàn tiền theo khiếu nại',
    });
    this._updatedAt = new Date();
  }

  /**
   * Kích hoạt hoàn tiền thật qua Cổng thanh toán (PayOS Refund Integration)
   */
  public executeRefund(params: {
    refundTransactionId: string;
    amount: number;
    reason?: string;
  }): void {
    if (
      this._status !== OrderStatus.PAID &&
      this._status !== OrderStatus.CANCELLED &&
      this._status !== OrderStatus.DELIVERED &&
      this._status !== OrderStatus.PROCESSING &&
      this._status !== OrderStatus.SHIPPED &&
      this._status !== OrderStatus.REFUND_REQUESTED &&
      this._status !== OrderStatus.REFUNDED
    ) {
      throw new Error(`Không thể hoàn tiền cho đơn hàng ở trạng thái "${this._status}".`);
    }

    this._status = OrderStatus.REFUNDED;
    this._refundTransactionId = params.refundTransactionId;
    this._refundAmount = params.amount;
    this._refundStatus = 'SUCCESS';

    this._timeline.push({
      status: 'REFUNDED',
      title: 'Hoàn tiền thành công qua cổng thanh toán PayOS',
      timestamp: new Date(),
      note: `Mã hoàn tiền (Refund Txn): ${params.refundTransactionId} · Số tiền: ${params.amount.toLocaleString(
        'vi-VN',
      )} VND${params.reason ? ` · ${params.reason}` : ''}`,
    });
    this._updatedAt = new Date();
  }

  public dispatch(trackingCode?: string, carrierCode: string = 'GHN', awbUrl?: string): void {
    if (this._status === OrderStatus.CANCELLED || this._status === OrderStatus.REFUNDED) {
      throw new Error(`Không thể bàn giao vận chuyển cho đơn hàng ở trạng thái "${this._status}".`);
    }
    this._status = OrderStatus.SHIPPED;
    if (trackingCode) {
      this._trackingCode = trackingCode;
    } else if (!this._trackingCode) {
      this._trackingCode = `${carrierCode}${Date.now().toString().slice(-8)}VN`;
    }
    this._timeline.push({
      status: 'SHIPPED',
      title: `Đã đóng gói và bàn giao cho đơn vị vận chuyển ${carrierCode}`,
      timestamp: new Date(),
      note: `Mã vận đơn: ${this._trackingCode}${awbUrl ? ` · Tem in bưu gửi (AWB): ${awbUrl}` : ''}`,
    });
    this._updatedAt = new Date();
  }

  public requestRefund(reason: string, _evidenceUrls?: string[]): void {
    if (!reason || !reason.trim()) {
      throw new Error('Lý do yêu cầu trả hàng / hoàn tiền là bắt buộc.');
    }
    if (this._status === OrderStatus.CANCELLED || this._status === OrderStatus.REFUNDED) {
      throw new Error(`Không thể yêu cầu hoàn tiền cho đơn hàng ở trạng thái "${this._status}".`);
    }
    this._status = OrderStatus.REFUND_REQUESTED;
    this._timeline.push({
      status: 'REFUND_REQUESTED',
      title: 'Khách hàng gửi yêu cầu trả hàng / hoàn tiền',
      timestamp: new Date(),
      note: reason.trim(),
    });
    this._updatedAt = new Date();
  }

  public rejectRefund(reason: string, restoredStatus: OrderStatus = OrderStatus.DELIVERED): void {
    if (!reason || !reason.trim()) {
      throw new Error('Lý do từ chối hoàn tiền (reason) là bắt buộc để ghi nhận audit log.');
    }
    this._status = restoredStatus;
    this._timeline.push({
      status: 'REFUND_REJECTED',
      title: 'Yêu cầu hoàn tiền đã bị từ chối / hủy bởi nhân viên hỗ trợ',
      timestamp: new Date(),
      note: reason.trim(),
    });
    this._updatedAt = new Date();
  }
}
