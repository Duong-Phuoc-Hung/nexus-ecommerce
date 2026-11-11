export interface FavoriteProps {
  id: string;
  userId: string;
  productId: string;
  createdAt: Date;
}

/**
 * Domain Entity: Favorite (Sản phẩm yêu thích / Wishlist)
 * Đại diện cho quan hệ yêu thích giữa Người mua (Buyer) và Sản phẩm (Product).
 */
export class Favorite {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _productId: string;
  private readonly _createdAt: Date;

  constructor(props: FavoriteProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._productId = props.productId;
    this._createdAt = props.createdAt || new Date();
  }

  public get id(): string {
    return this._id;
  }

  public get userId(): string {
    return this._userId;
  }

  public get productId(): string {
    return this._productId;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }
}
