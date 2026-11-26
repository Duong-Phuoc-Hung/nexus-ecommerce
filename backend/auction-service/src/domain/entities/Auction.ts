export const MAX_AUCTION_AMOUNT_VND = 1_000_000_000_000;
export const MIN_AUCTION_DURATION_MS = 60 * 60 * 1000; // 1 giờ (SRS 2.6)
export const MAX_AUCTION_DURATION_MS = 168 * 60 * 60 * 1000; // 7 ngày (SRS 2.6)
export const START_TIME_PAST_GRACE_MS = 60 * 1000; // Sai lệch đồng hồ tối đa 60 giây
export const DEFAULT_ANTI_SNIPING_WINDOW_SECONDS = 120; // Ngưỡng kích hoạt: còn <= 120 giây
export const DEFAULT_ANTI_SNIPING_EXTEND_SECONDS = 300; // Cộng thêm 5 phút (300 giây)
export const DEFAULT_MAX_ANTI_SNIPING_EXTENSIONS = 3; // Tối đa 3 lần gia hạn

export class BidAmountTooLowError extends Error {
  public readonly code = 'BID_AMOUNT_TOO_LOW';
  constructor(
    public readonly nextMinBid: number,
    public readonly currentHighestBid: number | null,
    message?: string,
  ) {
    super(message || `Mức tối thiểu hiện là ${nextMinBid.toLocaleString('vi-VN')} ₫.`);
    this.name = 'BidAmountTooLowError';
  }
}

export class BuyNowUnavailableError extends Error {
  public readonly code = 'BUY_NOW_UNAVAILABLE';
  constructor(message: string) {
    super(message);
    this.name = 'BuyNowUnavailableError';
  }
}

export enum AuctionStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  EXTENDED = 'EXTENDED',
  ENDED = 'ENDED',
  SETTLED = 'SETTLED',
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

export interface PlaceBidOutcome {
  previousLeaderId?: string;
  isExtended: boolean;
  oldEndTime: Date;
  newEndTime: Date;
  extensionCount: number;
}

export interface AuctionProps {
  id: string;
  productId: string;
  sellerId: string;
  title?: string;
  imageUrl?: string;
  startingPrice: number;
  currentHighestBid: number;
  highestBidderId?: string;
  bidCount?: number;
  bidIncrement: number;
  buyNowPrice?: number;
  status: AuctionStatus;
  startTime: Date;
  endTime: Date;
  actualEndTime?: Date;
  antiSnipingExtensionSeconds?: number;
  antiSnipingWindowSeconds?: number;
  antiSnipingExtendSeconds?: number;
  extensionCount?: number;
  maxExtensions?: number;
  cancelReason?: string;
  cancelledBy?: string;
  cancelledAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Auction {
  private readonly _id: string;
  private readonly _productId: string;
  private readonly _sellerId: string;
  private _title: string;
  private _imageUrl?: string;
  private readonly _startingPrice: number;
  private _currentHighestBid: number;
  private _highestBidderId?: string;
  private _bidCount: number;
  private _bidIncrement: number;
  private _buyNowPrice?: number;
  private _status: AuctionStatus;
  private _startTime: Date;
  private _endTime: Date;
  private _actualEndTime?: Date;
  private readonly _antiSnipingExtensionSeconds: number;
  private readonly _antiSnipingWindowSeconds: number;
  private readonly _antiSnipingExtendSeconds: number;
  private _extensionCount: number;
  private readonly _maxExtensions: number;
  private _cancelReason?: string;
  private _cancelledBy?: string;
  private _cancelledAt?: Date;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: AuctionProps) {
    this._id = props.id;
    this._productId = props.productId;
    this._sellerId = props.sellerId;
    this._title = props.title || `Phiên đấu giá sản phẩm #${props.productId}`;
    this._imageUrl = props.imageUrl;
    this._startingPrice = props.startingPrice;
    this._currentHighestBid = props.currentHighestBid;
    this._highestBidderId = props.highestBidderId;
    this._bidCount = props.bidCount ?? (props.highestBidderId ? 1 : 0);
    this._bidIncrement = props.bidIncrement;
    this._buyNowPrice = props.buyNowPrice;
    this._status = props.status;
    this._startTime = props.startTime;
    this._endTime = props.endTime;
    this._actualEndTime = props.actualEndTime;
    this._antiSnipingExtensionSeconds =
      props.antiSnipingExtensionSeconds ?? DEFAULT_ANTI_SNIPING_WINDOW_SECONDS;
    this._antiSnipingWindowSeconds =
      props.antiSnipingWindowSeconds ??
      (props.antiSnipingExtensionSeconds === 0 ? 0 : DEFAULT_ANTI_SNIPING_WINDOW_SECONDS);
    this._antiSnipingExtendSeconds =
      props.antiSnipingExtendSeconds ??
      (props.antiSnipingExtensionSeconds === 0 ? 0 : DEFAULT_ANTI_SNIPING_EXTEND_SECONDS);
    this._extensionCount = props.extensionCount ?? 0;
    this._maxExtensions = props.maxExtensions ?? DEFAULT_MAX_ANTI_SNIPING_EXTENSIONS;
    this._cancelReason = props.cancelReason;
    this._cancelledBy = props.cancelledBy;
    this._cancelledAt = props.cancelledAt;
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
  public get imageUrl(): string | undefined {
    return this._imageUrl;
  }
  public get startingPrice(): number {
    return this._startingPrice;
  }
  public get currentHighestBid(): number {
    return this._currentHighestBid;
  }
  public get hasBids(): boolean {
    return Boolean(this._highestBidderId) || this._bidCount > 0;
  }
  public get highestBidAmount(): number | null {
    return this.hasBids ? this._currentHighestBid : null;
  }
  public get nextMinBid(): number {
    return this.hasBids ? this._currentHighestBid + this._bidIncrement : this._startingPrice;
  }
  public get bidCount(): number {
    return this._bidCount;
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
  public get actualEndTime(): Date | undefined {
    return this._actualEndTime;
  }
  public get antiSnipingExtensionSeconds(): number {
    return this._antiSnipingExtensionSeconds;
  }
  public get antiSnipingWindowSeconds(): number {
    return this._antiSnipingWindowSeconds;
  }
  public get antiSnipingExtendSeconds(): number {
    return this._antiSnipingExtendSeconds;
  }
  public get extensionCount(): number {
    return this._extensionCount;
  }
  public get maxExtensions(): number {
    return this._maxExtensions;
  }
  public get cancelReason(): string | undefined {
    return this._cancelReason;
  }
  public get cancelledBy(): string | undefined {
    return this._cancelledBy;
  }
  public get cancelledAt(): Date | undefined {
    return this._cancelledAt;
  }
  public get createdAt(): Date {
    return this._createdAt;
  }
  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public setExtensionCount(count: number): void {
    this._extensionCount = Math.max(0, count);
  }

  public setBidCount(count: number): void {
    this._bidCount = Math.max(0, count);
  }

  /**
   * Tính trạng thái hiệu lực theo mốc thời gian thực tế:
   * - CANCELLED / ENDED luôn giữ nguyên.
   * - Đã quá endTime -> ENDED.
   * - Đang SCHEDULED nhưng đã tới startTime (và chưa hết endTime) -> ACTIVE.
   */
  public resolveEffectiveStatus(now: Date = new Date()): AuctionStatus {
    if (
      this._status === AuctionStatus.SETTLED ||
      this._status === AuctionStatus.CANCELLED ||
      this._status === AuctionStatus.ENDED
    ) {
      return this._status;
    }
    const nowMs = now.getTime();
    const startMs =
      this._startTime instanceof Date
        ? this._startTime.getTime()
        : new Date(this._startTime).getTime();
    const endMs =
      this._endTime instanceof Date ? this._endTime.getTime() : new Date(this._endTime).getTime();

    if (Number.isFinite(endMs) && nowMs >= endMs) {
      return AuctionStatus.ENDED;
    }
    if (this._status === AuctionStatus.SCHEDULED && Number.isFinite(startMs) && nowMs >= startMs) {
      return AuctionStatus.ACTIVE;
    }
    return this._status;
  }

  /**
   * Đồng bộ trạng thái nội bộ theo thời gian hiện tại.
   * Trả về true nếu trạng thái có thay đổi (để repository lưu lại).
   */
  public syncLifecycle(now: Date = new Date()): boolean {
    const nextStatus = this.resolveEffectiveStatus(now);
    if (nextStatus === this._status) return false;

    this._status = nextStatus;
    if (nextStatus === AuctionStatus.ENDED && !this._actualEndTime) {
      this._actualEndTime = this._endTime instanceof Date ? this._endTime : new Date(this._endTime);
    }
    this._updatedAt = now;
    return true;
  }

  // Nghiệp vụ đặt giá và Anti-sniping (G03 & Mục 11: lượt đầu được đặt đúng giá khởi điểm;
  // lượt sau tối thiểu = giá dẫn đầu + bước giá; còn 0..120s cộng 5 phút, tối đa 3 lần)
  public placeBid(bidderId: string, amount: number, now: Date = new Date()): PlaceBidOutcome {
    this.syncLifecycle(now);

    if (this._status !== AuctionStatus.ACTIVE && this._status !== AuctionStatus.EXTENDED) {
      throw new Error(`Phiên đấu giá #${this._id} hiện không mở để đặt giá.`);
    }

    if (now.getTime() >= this._endTime.getTime()) {
      this._status = AuctionStatus.ENDED;
      throw new Error(`Phiên đấu giá #${this._id} đã hết thời gian đặt giá.`);
    }

    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > MAX_AUCTION_AMOUNT_VND) {
      throw new Error('Số tiền đặt giá phải là số nguyên VND dương hợp lệ.');
    }

    const minRequiredBid = this.nextMinBid;
    if (amount < minRequiredBid) {
      throw new BidAmountTooLowError(minRequiredBid, this.highestBidAmount);
    }

    const previousLeaderId = this._highestBidderId;
    const oldEndTime = new Date(this._endTime.getTime());

    this._currentHighestBid = amount;
    this._highestBidderId = bidderId;
    this._bidCount += 1;

    // Tự động gia hạn nếu còn (0, 120s] và chưa quá 3 lần gia hạn
    let isExtended = false;
    const timeRemainingMs = this._endTime.getTime() - now.getTime();
    if (
      this._antiSnipingWindowSeconds > 0 &&
      this._antiSnipingExtendSeconds > 0 &&
      timeRemainingMs > 0 &&
      timeRemainingMs <= this._antiSnipingWindowSeconds * 1000 &&
      this._extensionCount < this._maxExtensions
    ) {
      this._endTime = new Date(this._endTime.getTime() + this._antiSnipingExtendSeconds * 1000);
      this._extensionCount += 1;
      this._status = AuctionStatus.EXTENDED;
      isExtended = true;
    }

    this._updatedAt = now;

    return {
      previousLeaderId,
      isExtended,
      oldEndTime,
      newEndTime: new Date(this._endTime.getTime()),
      extensionCount: this._extensionCount,
    };
  }

  // Nghiệp vụ chốt phiên đấu giá khi có người thắng (SRS 3.5.2)
  public settle(now: Date = new Date()): void {
    if (this._status === AuctionStatus.CANCELLED) {
      throw new Error('Không thể chốt phiên đấu giá đã bị hủy.');
    }
    if (this._status === AuctionStatus.SETTLED) {
      throw new Error('Phiên đấu giá này đã được chốt trước đó.');
    }
    if (!this._highestBidderId) {
      throw new Error('Không thể chốt phiên đấu giá khi không có người trả giá.');
    }
    this._status = AuctionStatus.SETTLED;
    if (!this._actualEndTime) {
      this._actualEndTime = now;
    }
    this._updatedAt = now;
  }

  // Nghiệp vụ mua thẳng (Buy It Now) — Mục 11: chỉ mở trước lượt đặt giá hợp lệ đầu tiên
  public buyNow(buyerId: string, now: Date = new Date()): void {
    this.syncLifecycle(now);

    if (this._status !== AuctionStatus.ACTIVE && this._status !== AuctionStatus.EXTENDED) {
      throw new BuyNowUnavailableError(`Phiên đấu giá #${this._id} hiện không mở để mua ngay.`);
    }

    if (!this._buyNowPrice || this._buyNowPrice <= 0) {
      throw new BuyNowUnavailableError(
        `Phiên đấu giá #${this._id} không hỗ trợ tính năng mua ngay.`,
      );
    }

    if (this.hasBids) {
      throw new BuyNowUnavailableError(
        'Tính năng Mua ngay chỉ mở trước khi có lượt đặt giá hợp lệ đầu tiên.',
      );
    }

    if (this._sellerId === buyerId) {
      throw new Error('Người bán không thể tự mua sản phẩm của chính mình.');
    }

    this._currentHighestBid = this._buyNowPrice;
    this._highestBidderId = buyerId;
    this._bidCount += 1;
    this._status = AuctionStatus.ENDED;
    this._actualEndTime = now;
    this._updatedAt = now;
  }

  // Nghiệp vụ hủy / dừng khẩn cấp phiên đấu giá
  public cancel(reason?: string, cancelledBy?: string, cancelledAt?: Date): void {
    const cancelTime = cancelledAt || new Date();
    this.syncLifecycle(cancelTime);
    if (this._status === AuctionStatus.ENDED || this._status === AuctionStatus.CANCELLED) {
      throw new Error('Không thể hủy phiên đấu giá đã kết thúc.');
    }
    this._status = AuctionStatus.CANCELLED;
    this._cancelReason = reason?.trim();
    this._cancelledBy = cancelledBy;
    this._cancelledAt = cancelTime;
    this._actualEndTime = cancelTime;
    this._updatedAt = cancelTime;
  }

  // Nghiệp vụ cập nhật phiên (chỉ cho phép khi chưa bắt đầu)
  public updateDetails(params: {
    title?: string;
    imageUrl?: string;
    bidIncrement?: number;
    buyNowPrice?: number;
    startTime?: Date;
    endTime?: Date;
  }): void {
    const now = new Date();
    this.syncLifecycle(now);

    if (this._status !== AuctionStatus.SCHEDULED) {
      throw new Error('Chỉ có thể chỉnh sửa phiên đấu giá khi chưa bắt đầu (SCHEDULED).');
    }

    if (params.title !== undefined) {
      const cleanTitle = params.title.trim();
      if (!cleanTitle || cleanTitle.length > 200) {
        throw new Error('Tiêu đề phiên đấu giá cần từ 1 đến 200 ký tự.');
      }
      this._title = cleanTitle;
    }

    if (params.bidIncrement !== undefined) {
      const step = Number(params.bidIncrement);
      if (!Number.isSafeInteger(step) || step <= 0 || step > MAX_AUCTION_AMOUNT_VND) {
        throw new Error('Bước giá (bidStep) phải là số nguyên VND dương hợp lệ.');
      }
      this._bidIncrement = step;
    }

    if (params.buyNowPrice !== undefined) {
      const bn = Number(params.buyNowPrice);
      if (!Number.isSafeInteger(bn) || bn <= this._startingPrice || bn > MAX_AUCTION_AMOUNT_VND) {
        throw new Error('Giá mua ngay (buyNowPrice) phải là số nguyên VND lớn hơn giá khởi điểm.');
      }
      this._buyNowPrice = bn;
    }

    const nextStart = params.startTime ? new Date(params.startTime) : this._startTime;
    const nextEnd = params.endTime ? new Date(params.endTime) : this._endTime;

    if (isNaN(nextStart.getTime()) || isNaN(nextEnd.getTime())) {
      throw new Error('Thời gian bắt đầu hoặc kết thúc không đúng định dạng hợp lệ.');
    }
    if (params.startTime && nextStart.getTime() <= now.getTime()) {
      throw new Error('Thời gian bắt đầu phiên đấu giá không được nằm trong quá khứ.');
    }
    if (nextStart.getTime() >= nextEnd.getTime()) {
      throw new Error('Thời gian bắt đầu (startTime) phải trước thời gian kết thúc (endTime).');
    }
    if (nextEnd.getTime() <= now.getTime()) {
      throw new Error('Thời gian kết thúc phiên đấu giá phải ở tương lai.');
    }
    const durationMs = nextEnd.getTime() - nextStart.getTime();
    if (durationMs < MIN_AUCTION_DURATION_MS || durationMs > MAX_AUCTION_DURATION_MS) {
      throw new Error('Thời lượng phiên đấu giá phải từ 1 giờ đến 7 ngày (168 giờ).');
    }

    if (params.imageUrl !== undefined) this._imageUrl = params.imageUrl;
    if (params.startTime) this._startTime = nextStart;
    if (params.endTime) this._endTime = nextEnd;
    this._updatedAt = now;
  }
}
