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
  images?: string[];
  primaryImage?: string;
  attributes?: Record<string, string>;
  condition?: string;
  slug?: string;
  allowAuction?: boolean;
  currency?: string;
  categoryName?: string;
  sellerName?: string;
  saleType?: string;
}

/**
 * Domain Entity: Product
 * Đại diện cho sản phẩm hàng hóa trong Catalog Bounded Context (SRS 3.3).
 * Độc lập hoàn toàn với database và các service khác.
 * Bất kỳ dữ liệu nào lấy từ PostgreSQL lên (dù có lộn xộn đến đâu) thì khi đi qua file này cũng phải được ép vào đúng khuôn mẫu chuẩn của hệ thống.
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
  private _images: string[];
  private _primaryImage?: string;
  private _attributes: Record<string, string>;
  private _condition?: string;
  private _slug?: string;
  private _allowAuction?: boolean;
  private _currency: string;
  private _categoryName?: string;
  private _sellerName?: string;
  private _saleType?: string;

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
    this._images = props.images || [];
    this._primaryImage =
      props.primaryImage || (this._images.length > 0 ? this._images[0] : undefined);
    this._attributes = props.attributes || {};
    this._condition = props.condition;
    this._slug = props.slug;
    this._allowAuction = props.allowAuction;
    this._currency = props.currency || 'VND';
    this._categoryName = props.categoryName;
    this._sellerName = props.sellerName;
    this._saleType = props.saleType || (props.allowAuction ? 'AUCTION' : 'FIXED_PRICE');
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

  public get categoryName(): string | undefined {
    return this._categoryName;
  }

  public setCategoryName(name: string): void {
    this._categoryName = name;
  }

  public get sellerName(): string | undefined {
    return this._sellerName;
  }

  public setSellerName(name: string): void {
    this._sellerName = name;
  }

  public get currency(): string {
    return this._currency;
  }

  public get saleType(): 'FIXED_PRICE' | 'AUCTION' {
    return (
      (this._saleType as 'FIXED_PRICE' | 'AUCTION') ||
      (this._allowAuction ? 'AUCTION' : 'FIXED_PRICE')
    );
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

  public get images(): string[] {
    return this._images;
  }

  public get primaryImage(): string | undefined {
    return this._primaryImage;
  }

  public get attributes(): Record<string, string> {
    return this._attributes;
  }

  public get condition(): string | undefined {
    return this._condition;
  }

  public get slug(): string | undefined {
    return this._slug;
  }

  public get allowAuction(): boolean | undefined {
    return this._allowAuction;
  }

  public isAvailable(): boolean {
    // Kiểm tra xem sản phẩm có sẵn sàng để được bán không
    return this._status === ProductStatus.ACTIVE && this._stockQuantity > 0;
  }

  public updateDetails(params: {
    title?: string;
    description?: string;
    price?: number;
    stockQuantity?: number;
    status?: ProductStatus;
    categoryId?: string;
    images?: string[];
    primaryImage?: string;
    attributes?: Record<string, string>;
    condition?: string;
    slug?: string;
    allowAuction?: boolean;
    currency?: string;
    categoryName?: string;
    sellerName?: string;
    saleType?: string;
  }): void {
    if (params.title !== undefined) this._title = params.title;
    if (params.description !== undefined) this._description = params.description;
    if (params.price !== undefined) this._price = params.price;
    if (params.stockQuantity !== undefined) this._stockQuantity = params.stockQuantity;
    if (params.status !== undefined) this._status = params.status;
    if (params.categoryId !== undefined) this._categoryId = params.categoryId;
    if (params.images !== undefined) {
      this._images = params.images;
      this._primaryImage =
        params.primaryImage || (this._images.length > 0 ? this._images[0] : undefined);
    }
    if (params.attributes !== undefined) this._attributes = params.attributes;
    if (params.condition !== undefined) this._condition = params.condition;
    if (params.slug !== undefined) this._slug = params.slug;
    if (params.allowAuction !== undefined) this._allowAuction = params.allowAuction;
    if (params.currency !== undefined) this._currency = params.currency;
    if (params.categoryName !== undefined) this._categoryName = params.categoryName;
    if (params.sellerName !== undefined) this._sellerName = params.sellerName;
    if (params.saleType !== undefined) this._saleType = params.saleType;
    this._updatedAt = new Date();
  }

  public reduceStock(quantity: number): void {
    // Giảm số lượng tồn kho
    if (quantity > this._stockQuantity) {
      throw new Error(
        `Insufficient stock for product ${this._id}. Current: ${this._stockQuantity}`,
      );
    }
    this._stockQuantity -= quantity;
    if (this._stockQuantity === 0) {
      this._status = ProductStatus.OUT_OF_STOCK; // Hết hàng
    }
    this._updatedAt = new Date();
  }
}
