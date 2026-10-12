export enum AuctionStatus {
  UPCOMING = 'UPCOMING',
  ACTIVE = 'ACTIVE',
  EXTENDED = 'EXTENDED',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
}

export interface BidRecord {
  bidId: string;
  bidderId: string;
  amount: number;
  bidTime: Date;
}

export interface AuctionProps {
  id: string;
  productId: string;
  sellerId: string;
  startingPrice: number;
  currentHighestBid: number;
  highestBidderId?: string;
  bidIncrement: number;
  status: AuctionStatus;
  startTime: Date;
  endTime: Date;
  antiSnipingExtensionSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Domain Entity: Auction
 * Lõi nghiệp vụ phòng đấu giá trực tuyến (SRS 3.5, 5.1 Bidding Engine SLA <= 300ms).
 */
export class Auction {
  private readonly _id: string;
  private readonly _productId: string;
  private readonly _sellerId: string;
  private readonly _startingPrice: number;
  private _currentHighestBid: number;
  private _highestBidderId?: string;
  private readonly _bidIncrement: number;
  private _status: AuctionStatus;
  private readonly _startTime: Date;
  private _endTime: Date;
  private readonly _antiSnipingExtensionSeconds: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: AuctionProps) {
    this._id = props.id;
    this._productId = props.productId;
    this._sellerId = props.sellerId;
    this._startingPrice = props.startingPrice;
    this._currentHighestBid = props.currentHighestBid;
    this._highestBidderId = props.highestBidderId;
    this._bidIncrement = props.bidIncrement;
    this._status = props.status;
    this._startTime = props.startTime;
    this._endTime = props.endTime;
    this._antiSnipingExtensionSeconds = props.antiSnipingExtensionSeconds;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
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

  public get currentHighestBid(): number {
    return this._currentHighestBid;
  }

  public get highestBidderId(): string | undefined {
    return this._highestBidderId;
  }

  public get bidIncrement(): number {
    return this._bidIncrement;
  }

  public get status(): AuctionStatus {
    return this._status;
  }

  public get endTime(): Date {
    return this._endTime;
  }

  public placeBid(bidderId: string, amount: number, now: Date = new Date()): void {
    if (this._status !== AuctionStatus.ACTIVE && this._status !== AuctionStatus.EXTENDED) {
      throw new Error(`Auction ${this._id} is not open for bidding.`);
    }

    const minRequiredBid = this._currentHighestBid + this._bidIncrement;
    if (amount < minRequiredBid) {
      throw new Error(`Bid amount must be at least ${minRequiredBid}`);
    }

    this._currentHighestBid = amount;
    this._highestBidderId = bidderId;

    // SRS 3.5: Anti-sniping soft close (tự động gia hạn nếu có bid ở phút chót)
    const timeRemainingMs = this._endTime.getTime() - now.getTime();
    if (timeRemainingMs < this._antiSnipingExtensionSeconds * 1000) {
      this._endTime = new Date(this._endTime.getTime() + this._antiSnipingExtensionSeconds * 1000);
      this._status = AuctionStatus.EXTENDED;
    }

    this._updatedAt = new Date();
  }
}
