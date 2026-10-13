export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderProps {
  id: string;
  buyerId: string;
  sellerId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentTransactionId?: string;
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
  private readonly _sellerId: string;
  private _items: OrderItem[];
  private _totalAmount: number;
  private _status: OrderStatus;
  private _paymentTransactionId?: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: OrderProps) {
    this._id = props.id;
    this._buyerId = props.buyerId;
    this._sellerId = props.sellerId;
    this._items = props.items;
    this._totalAmount = props.totalAmount;
    this._status = props.status;
    this._paymentTransactionId = props.paymentTransactionId;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get id(): string {
    return this._id;
  }

  public get buyerId(): string {
    return this._buyerId;
  }

  public get sellerId(): string {
    return this._sellerId;
  }

  public get items(): OrderItem[] {
    return [...this._items];
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
    this._updatedAt = new Date();
  }
}
