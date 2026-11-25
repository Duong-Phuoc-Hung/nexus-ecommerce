export interface ReviewProps {
  id: string;
  productId: string;
  userId: string;
  orderId?: string | null;
  userName?: string;
  rating: number;
  comment: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Domain Entity: Review (Đánh giá & Bình luận sản phẩm)
 * Chứa quy tắc nghiệp vụ: Điểm đánh giá bắt buộc từ 1 đến 5 sao.
 */
export class Review {
  private readonly _id: string;
  private readonly _productId: string;
  private readonly _userId: string;
  private readonly _orderId: string | null;
  private readonly _userName: string;
  private _rating: number;
  private _comment: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: ReviewProps) {
    if (!props.productId) throw new Error('Mã sản phẩm (productId) không được để trống.');
    if (!props.userId) throw new Error('Mã người dùng (userId) không được để trống.');
    if (!Number.isInteger(props.rating) || props.rating < 1 || props.rating > 5) {
      throw new Error('Điểm đánh giá (rating) phải là số nguyên từ 1 đến 5 sao.');
    }

    this._id = props.id;
    this._productId = props.productId;
    this._userId = props.userId;
    this._orderId = props.orderId ? String(props.orderId).trim() : null;
    this._userName = props.userName || 'Người mua ẩn danh';
    this._rating = props.rating;
    this._comment = props.comment ? props.comment.trim() : '';
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  public get id(): string {
    return this._id;
  }

  public get productId(): string {
    return this._productId;
  }

  public get userId(): string {
    return this._userId;
  }

  public get orderId(): string | null {
    return this._orderId;
  }

  public get userName(): string {
    return this._userName;
  }

  public get rating(): number {
    return this._rating;
  }

  public get comment(): string {
    return this._comment;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }
}
