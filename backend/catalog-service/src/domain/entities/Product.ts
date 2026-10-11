export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

export interface ProductProps {
  id: string;
  sellerId: string;
  categoryId: string;
  title: string;
  description: string;
  price: number;
  stockQuantity: number;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Domain Entity: Product
 * Đại diện cho sản phẩm hàng hóa trong Catalog Bounded Context (SRS 3.3).
 * Độc lập hoàn toàn với database và các service khác.
 */
export class Product {
  private readonly _id: string;
  private readonly _sellerId: string;
  private _categoryId: string;
  private _title: string;
  private _description: string;
  private _price: number;
  private _stockQuantity: number;
  private _status: ProductStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: ProductProps) {
    this._id = props.id;
    this._sellerId = props.sellerId;
    this._categoryId = props.categoryId;
    this._title = props.title;
    this._description = props.description;
    this._price = props.price;
    this._stockQuantity = props.stockQuantity;
    this._status = props.status;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get id(): string {
    return this._id;
  }

  public get sellerId(): string {
    return this._sellerId;
  }

  public get categoryId(): string {
    return this._categoryId;
  }

  public get title(): string {
    return this._title;
  }

  public get description(): string {
    return this._description;
  }

  public get price(): number {
    return this._price;
  }

  public get stockQuantity(): number {
    return this._stockQuantity;
  }

  public get status(): ProductStatus {
    return this._status;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public isAvailable(): boolean {
    return this._status === ProductStatus.ACTIVE && this._stockQuantity > 0;
  }

  public reduceStock(quantity: number): void {
    if (quantity > this._stockQuantity) {
      throw new Error(
        `Insufficient stock for product ${this._id}. Current: ${this._stockQuantity}`,
      );
    }
    this._stockQuantity -= quantity;
    if (this._stockQuantity === 0) {
      this._status = ProductStatus.OUT_OF_STOCK;
    }
    this._updatedAt = new Date();
  }
}
