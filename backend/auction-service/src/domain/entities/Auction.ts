export enum AuctionStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  EXTENDED = 'EXTENDED',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
}

export interface BidRecord {
  id?: string;
  bidId?: string;
  auctionId: string;
  bidderId: string;
  amount: number;
  bidTime: Date;
  isWinning?: boolean;
}

export interface AuctionProps {
  id: string;
  productId: string;
  sellerId: string;
  title?: string;
  startingPrice: number;
  currentHighestBid: number;
  highestBidderId?: string;
  bidIncrement: number;
  buyNowPrice?: number;
  status: AuctionStatus;
  startTime: Date;
  endTime: Date;
  antiSnipingExtensionSeconds?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Auction {
  private readonly _id: string;
  private readonly _productId: string;
  private readonly _sellerId: string;
  private _title: string;
  private readonly _startingPrice: number;
  private _currentHighestBid: number;
  private _highestBidderId?: string;
  private _bidIncrement: number;
  private _buyNowPrice?: number;
  private _status: AuctionStatus;
  private _startTime: Date;
  private _endTime: Date;
  private readonly _antiSnipingExtensionSeconds: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: AuctionProps) {
    this._id = props.id;
    this._productId = props.productId;
    this._sellerId = props.sellerId;
    this._title = props.title || `Phiên đấu giá sản phẩm #${props.productId}`;
    this._startingPrice = props.startingPrice;
    this._currentHighestBid = props.currentHighestBid;
    this._highestBidderId = props.highestBidderId;
    this._bidIncrement = props.bidIncrement;
    this._buyNowPrice = props.buyNowPrice;
    this._status = props.status;
    this._startTime = props.startTime;
    this._endTime = props.endTime;
    this._antiSnipingExtensionSeconds = props.antiSnipingExtensionSeconds ?? 120;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  public get id(): string {
    return this._id;
  }
  public get productId(): string {
    return this._productId;
  }
  public get sellerId(): string {
    return this._sellerId;
  }
  public get title(): string {
    return this._title;
  }
  public get startingPrice(): number {
    return this._startingPrice;
  }
  public get currentHighestBid(): number {
    return this._currentHighestBid;
  }
  public get highestBidderId(): string | undefined {
    return this._highestBidderId;
  }
  public get bidIncrement(): number {
    return this._bidIncrement;
  }
  public get buyNowPrice(): number | undefined {
    return this._buyNowPrice;
  }
  public get status(): AuctionStatus {
    return this._status;
  }
  public get startTime(): Date {
    return this._startTime;
  }
  public get endTime(): Date {
    return this._endTime;
  }
  public get antiSnipingExtensionSeconds(): number {
    return this._antiSnipingExtensionSeconds;
  }
  public get createdAt(): Date {
    return this._createdAt;
  }
  public get updatedAt(): Date {
    return this._updatedAt;
  }

  // Nghiệp vụ đặt giá và Anti-sniping
  public placeBid(bidderId: string, amount: number, now: Date = new Date()): void {
    if (this._status !== AuctionStatus.ACTIVE && this._status !== AuctionStatus.EXTENDED) {
      throw new Error(`Phiên đấu giá #${this._id} hiện không mở để đặt giá.`);
    }

    const minRequiredBid = this._currentHighestBid + this._bidIncrement;
    if (amount < minRequiredBid) {
      throw new Error(`Mức giá đặt tối thiểu phải là ${minRequiredBid} VND.`);
    }

    this._currentHighestBid = amount;
    this._highestBidderId = bidderId;

    // Tự động gia hạn nếu có bid ở phút chót
    const timeRemainingMs = this._endTime.getTime() - now.getTime();
    if (timeRemainingMs < this._antiSnipingExtensionSeconds * 1000) {
      this._endTime = new Date(this._endTime.getTime() + this._antiSnipingExtensionSeconds * 1000);
      this._status = AuctionStatus.EXTENDED;
    }

    this._updatedAt = new Date();
  }

  // Nghiệp vụ hủy phiên
  public cancel(reason?: string): void {
    if (this._status === AuctionStatus.ENDED) {
      throw new Error('Không thể hủy phiên đấu giá đã kết thúc.');
    }
    this._status = AuctionStatus.CANCELLED;
    this._updatedAt = new Date();
  }

  // Nghiệp vụ cập nhật phiên (chỉ cho phép khi chưa bắt đầu)
  public updateDetails(params: {
    title?: string;
    bidIncrement?: number;
    buyNowPrice?: number;
    startTime?: Date;
    endTime?: Date;
  }): void {
    if (this._status !== AuctionStatus.SCHEDULED) {
      throw new Error('Chỉ có thể chỉnh sửa phiên đấu giá khi chưa bắt đầu (SCHEDULED).');
    }
    if (params.title) this._title = params.title;
    if (params.bidIncrement) this._bidIncrement = params.bidIncrement;
    if (params.buyNowPrice !== undefined) this._buyNowPrice = params.buyNowPrice;
    if (params.startTime) this._startTime = params.startTime;
    if (params.endTime) this._endTime = params.endTime;
    this._updatedAt = new Date();
  }
}
