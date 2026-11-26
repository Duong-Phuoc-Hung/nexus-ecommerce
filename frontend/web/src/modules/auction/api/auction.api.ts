import { getMarketplaceFeed } from '../../home/api/marketplace.api';
import { appConfig } from '../../../configs/app.config';
import { requestApi } from '../../../lib/axios/api-client';
import { ApiError, unwrap } from '../../../lib/axios/http';
import { catalogApi } from '../../catalog/api/catalog.api';

export type AuctionStatus = 'SCHEDULED' | 'ACTIVE' | 'EXTENDED' | 'ENDED' | 'CANCELLED';
export type AuctionVisibility = 'PUBLIC' | 'RESTRICTED';

export type AuctionBid = {
  id: string;
  bidder: string;
  displayAlias?: string;
  amount: number;
  time: number;
  key?: string;
  isMine?: boolean;
  status?: 'COMMITTED' | 'REJECTED';
  errorCode?: string;
};

export type AuctionModel3D = {
  url: string;
  poster?: string;
  label?: string;
  isIllustrative?: boolean;
};

export type AuctionSettlementSummary = {
  outcome?: 'WON' | 'LOST' | 'NO_BIDS' | 'CANCELLED' | 'PENDING';
  closedReason?: 'TIME_EXPIRED' | 'BUY_NOW' | 'ADMIN_CANCELLED' | null;
  winnerId?: string | null;
  winnerAlias?: string | null;
  winnerName?: string | null;
  finalPrice?: number | null;
  winningBidAmount?: number | null;
  settledAt?: number | null;
  paymentDueAt?: number | null;
  orderId?: string | null;
  orderCode?: string | null;
  orderStatus?: string | null;
  paymentStatus?: string | null;
  paymentUrl?: string | null;
  lastSyncedAt?: number | null;
  canCheckout?: boolean;
};

export type AuctionAuditEntry = {
  id: string;
  action: string;
  label: string;
  timestamp: number;
  actor: string;
  actorRole?: string;
  detail?: string;
  internalNote?: string;
  publicReason?: string;
};

export type Auction = {
  id: string;
  productId: string;
  title: string;
  image: string;
  images?: string[];
  model3d?: AuctionModel3D | null;
  seller: string;
  sellerId?: string;
  condition: string;
  description: string;
  startingPrice: number;
  increment: number;
  buyNowPrice?: number | null;
  nextMinBid?: number;
  startAt: number;
  endAt: number;
  originalEndAt?: number;
  status: AuctionStatus;
  visibility?: AuctionVisibility;
  version: number;
  bids: AuctionBid[];
  currentHighestBid?: number | null;
  bidCount?: number | null;
  bidHistoryAvailable?: boolean;
  cancelReason?: string;
  internalCancelNote?: string;
  extensionWindowSeconds?: number;
  extensionDurationSeconds?: number;
  maxExtensions?: number;
  extensionsUsed?: number;
  paymentWindowHours?: number;
  demoMode?: boolean;
  demoMultiplier?: number;
  createdByAdminId?: string;
  auditRef?: string;
  settlement?: AuctionSettlementSummary | null;
  auditTrail?: AuctionAuditEntry[];
};

export type AuctionInput = {
  productId: string;
  sellerId?: string;
  title?: string;
  startingPrice: number;
  increment: number;
  buyNowPrice?: number | null;
  visibility?: AuctionVisibility;
  demoMode?: boolean;
  demoMultiplier?: number;
  startAt: number;
  endAt: number;
};

export type AuctionCheckoutAddress = {
  fullName: string;
  phone: string;
  province: string;
  district?: string;
  ward?: string;
  addressLine: string;
  country: string;
};

export type AuctionCheckoutResult = {
  orderId: string;
  orderCode?: string | number;
  totalAmount: number;
  payment: {
    paymentLinkId?: string;
    checkoutUrl: string;
    status: string;
  };
};

export type AuctionProductOption = Awaited<
  ReturnType<typeof getMarketplaceFeed>
>['products'][number] & {
  sellerId?: string;
};

export type Actor = { id: string; role: string; status: string; permissions?: string[] };

export function canManageAuction(actor: Actor | null | undefined, permission: string): boolean {
  return (
    !!actor &&
    actor.role === 'ADMIN' &&
    actor.status === 'ACTIVE' &&
    (!actor.permissions || actor.permissions.includes(permission))
  );
}

export function assertAuctionAdmin(actor: Actor | undefined, permission: string) {
  if (!canManageAuction(actor, permission))
    throw new AuctionError('Tài khoản không có quyền thực hiện thao tác này.', 'FORBIDDEN');
}

const KEY = 'nexus.auctions.v1';
const EVENT = 'nexus:auctions-changed';

export const auctionStatusLabel: Record<AuctionStatus, string> = {
  SCHEDULED: 'Sắp diễn ra',
  ACTIVE: 'Đang diễn ra',
  EXTENDED: 'Đã gia hạn',
  ENDED: 'Đã kết thúc',
  CANCELLED: 'Đã hủy',
};

export function isAuctionOpenForBidding(status: AuctionStatus): boolean {
  return status === 'ACTIVE' || status === 'EXTENDED';
}

export class AuctionError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}

export function hasCommittedBids(a: Auction): boolean {
  if (typeof a.bidCount === 'number') return a.bidCount > 0;
  if (a.bids.length > 0) return true;
  return a.currentHighestBid != null;
}

export function currentPrice(a: Auction) {
  return a.currentHighestBid ?? a.bids[0]?.amount ?? a.startingPrice;
}

export function nextPrice(a: Auction) {
  if (typeof a.nextMinBid === 'number' && Number.isFinite(a.nextMinBid) && a.nextMinBid > 0) {
    return a.nextMinBid;
  }
  return hasCommittedBids(a) ? currentPrice(a) + a.increment : a.startingPrice;
}

export function lifecycle(a: Auction, now = Date.now()): AuctionStatus {
  if (a.status === 'CANCELLED') return 'CANCELLED';
  if (a.status === 'ENDED') return 'ENDED';
  if (now >= a.endAt) return 'ENDED';
  if (now >= a.startAt) return a.status === 'EXTENDED' ? 'EXTENDED' : 'ACTIVE';
  return 'SCHEDULED';
}

export function validateAuction(input: AuctionInput, now = Date.now()) {
  if (!input.productId) throw new AuctionError('Chọn sản phẩm cho phiên đấu.', 'VALIDATION');
  if (
    ![input.startingPrice, input.increment].every(
      (n) => Number.isSafeInteger(n) && n > 0 && n <= 1_000_000_000_000,
    )
  )
    throw new AuctionError(
      'Giá và bước giá phải là số nguyên VND dương, tối đa 1.000 tỷ.',
      'VALIDATION',
    );
  if (input.buyNowPrice != null) {
    if (
      !Number.isSafeInteger(input.buyNowPrice) ||
      input.buyNowPrice <= input.startingPrice ||
      input.buyNowPrice > 1_000_000_000_000
    ) {
      throw new AuctionError(
        'Giá mua ngay phải là số nguyên VND lớn hơn giá khởi điểm.',
        'VALIDATION',
      );
    }
  }
  if (!Number.isFinite(input.startAt))
    throw new AuctionError('Giờ bắt đầu không đúng định dạng hợp lệ.', 'VALIDATION');
  if (input.startAt <= now)
    throw new AuctionError('Giờ bắt đầu không được nằm trong quá khứ.', 'VALIDATION');
  if (!Number.isFinite(input.endAt))
    throw new AuctionError('Giờ kết thúc không đúng định dạng hợp lệ.', 'VALIDATION');
  if (input.endAt <= now)
    throw new AuctionError('Giờ kết thúc phải nằm ở tương lai.', 'VALIDATION');
  if (input.endAt <= input.startAt)
    throw new AuctionError('Giờ kết thúc phải sau giờ bắt đầu.', 'VALIDATION');
  const duration = input.endAt - input.startAt;
  if (duration < 3600000 || duration > 168 * 3600000)
    throw new AuctionError('Thời lượng phiên phải từ 1 giờ đến 7 ngày.', 'VALIDATION');
}

export function acceptBid(
  a: Auction,
  amount: number,
  actor: Actor,
  version: number,
  key: string,
  now = Date.now(),
): Auction {
  if (
    actor.role !== 'BUYER' ||
    actor.status !== 'ACTIVE' ||
    (actor.permissions && !actor.permissions.includes('AUCTION.BID'))
  )
    throw new AuctionError('Chỉ tài khoản Buyer đang hoạt động được đặt giá.', 'FORBIDDEN');
  const previous = a.bids.find((b) => b.key === key);
  if (previous) {
    if (previous.bidder !== actor.id || previous.amount !== amount)
      throw new AuctionError('Mã yêu cầu đã được sử dụng.', 'CONFLICT');
    return a;
  }
  if (!isAuctionOpenForBidding(lifecycle(a, now)))
    throw new AuctionError('Phiên đấu hiện không nhận giá.', 'CLOSED');
  if (version !== a.version)
    throw new AuctionError(
      'Phiên vừa thay đổi. Hãy kiểm tra giá mới rồi xác nhận lại.',
      'CONFLICT',
    );
  if (!Number.isSafeInteger(amount) || amount < nextPrice(a) || amount > 1_000_000_000_000)
    throw new AuctionError('Giá phải là số nguyên VND và không thấp hơn mức tối thiểu.', 'LOW_BID');
  return {
    ...a,
    version: a.version + 1,
    bids: [{ id: key, key, bidder: actor.id, amount, time: now, status: 'COMMITTED' }, ...a.bids],
  };
}

async function read(): Promise<Auction[]> {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try {
      const rows = JSON.parse(raw);
      if (
        Array.isArray(rows) &&
        rows.every((a) => a.id && Array.isArray(a.bids) && Number.isFinite(a.endAt))
      )
        return rows;
    } catch {
      /* Show an error rather than silently discard the user's local work. */
    }
    throw new AuctionError(
      'Không đọc được dữ liệu phiên trên thiết bị. Vui lòng liên hệ nhóm phát triển.',
      'INVALID_DATA',
    );
  }
  const feed = await getMarketplaceFeed(),
    now = Date.now();
  const rows: Auction[] = feed.products
    .filter((p) => p.mode === 'auction')
    .map((p) => ({
      id: p.id,
      productId: p.id,
      title: p.name,
      image: p.image,
      images: [p.image],
      seller: p.seller,
      condition: p.condition,
      description: `Khám phá ${p.name.toLowerCase()}. Xem kỹ tình trạng, mức giá và thời gian trước khi tham gia.`,
      startingPrice: p.startingPrice,
      increment: p.increment,
      startAt: p.status === 'active' ? now - 3600000 : now + 3600000,
      endAt:
        p.status === 'active' ? now + Math.max(3600, p.remainingSeconds) * 1000 : now + 86400000,
      originalEndAt:
        p.status === 'active' ? now + Math.max(3600, p.remainingSeconds) * 1000 : now + 86400000,
      status: p.status === 'active' ? 'ACTIVE' : 'SCHEDULED',
      visibility: 'PUBLIC',
      version: 1,
      extensionWindowSeconds: 300,
      extensionDurationSeconds: 300,
      maxExtensions: 5,
      extensionsUsed: 0,
      paymentWindowHours: 24,
      bids:
        p.status === 'active'
          ? [
              {
                id: 'opening-' + p.id,
                bidder: 'Người tham gia •128',
                amount: p.price,
                time: now - 60000,
                status: 'COMMITTED',
              },
            ]
          : [],
    }));
  if (rows[0])
    rows.push({
      ...rows[0],
      id: 'NX-CLOSED',
      startAt: now - 86400000,
      endAt: now - 3600000,
      status: 'ENDED',
      bids: [],
    });
  if (localStorage.getItem(KEY)) return read();
  localStorage.setItem(KEY, JSON.stringify(rows));
  return rows;
}

function save(rows: Auction[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    throw new AuctionError(
      'Không lưu được trên thiết bị. Hãy kiểm tra quyền lưu trữ hoặc dung lượng.',
      'STORAGE',
    );
  }
  window.dispatchEvent(new Event(EVENT));
}

function assertDevelopment() {
  if (process.env.NODE_ENV !== 'development')
    throw new AuctionError('Chức năng đang được hoàn thiện.', 'UNAVAILABLE');
}

async function mutation<T>(fn: () => Promise<T>): Promise<T> {
  assertDevelopment();
  if (navigator.locks) return navigator.locks.request(KEY, fn);
  return fn();
}

function row(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function timestamp(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

type AuctionProduct = Awaited<ReturnType<typeof catalogApi.detail>>;
const productCache = new Map<string, AuctionProduct>();

async function mapServerAuction(value: unknown): Promise<Auction> {
  const source = row(value);
  const productId = String(source.productId ?? '');
  const id = String(source.id ?? '');
  if (!id || !productId)
    throw new ApiError('Phiên đấu thiếu mã phiên hoặc mã sản phẩm.', undefined, 'INVALID_AUCTION');

  let product = productCache.get(productId);
  if (!product) {
    try {
      product = await catalogApi.detail(productId);
      productCache.set(productId, product);
    } catch {
      // The auction payload can still render when the catalog is unavailable.
    }
  }

  const now = Date.now();
  const currentHighestBid = optionalNumber(source.currentHighestBid ?? source.highestBidAmount);
  const statusValue = String(source.status ?? 'ACTIVE').toUpperCase();
  const rawStatus: AuctionStatus = (
    ['ACTIVE', 'EXTENDED', 'SCHEDULED', 'ENDED', 'CANCELLED'] as const
  ).includes(statusValue as AuctionStatus)
    ? (statusValue as AuctionStatus)
    : statusValue === 'SETTLED' || statusValue === 'CLOSED' || statusValue === 'COMPLETED'
      ? 'ENDED'
      : statusValue === 'UPCOMING'
        ? 'SCHEDULED'
        : 'ACTIVE';

  const actualEndAt = source.actualEndTime ? timestamp(source.actualEndTime, now) : null;
  const rawEndAt = timestamp(source.effectiveEndsAt ?? source.endTime ?? source.endAt, now);
  const endAt =
    (rawStatus === 'ENDED' || rawStatus === 'CANCELLED') && actualEndAt
      ? Math.min(rawEndAt, actualEndAt)
      : rawEndAt;
  const startAt = timestamp(
    source.startsAt ?? source.startTime ?? source.startAt,
    rawStatus === 'SCHEDULED' ? endAt : now,
  );
  const status: AuctionStatus = lifecycle({ status: rawStatus, startAt, endAt } as Auction, now);
  const originalEndAt = timestamp(source.originalEndTime ?? source.originalEndAt, endAt);
  const bidCountValue = source.bidCount ?? source.totalBids;
  const rawBids = Array.isArray(source.bids) ? source.bids : [];
  const mappedBids: AuctionBid[] = rawBids.map((entry, idx) => {
    const b = row(entry);
    return {
      id: String(b.bidId ?? b.id ?? `${id}-bid-${idx}`),
      bidder: String(b.bidderId ?? b.bidder ?? b.displayAlias ?? 'Thành viên'),
      displayAlias: typeof b.displayAlias === 'string' ? b.displayAlias : undefined,
      amount: numberValue(b.amount ?? b.bidAmount, 0),
      time: timestamp(b.acceptedAt ?? b.createdAt ?? b.time, now),
      key: typeof b.idempotencyKey === 'string' ? b.idempotencyKey : undefined,
      isMine: typeof b.isMine === 'boolean' ? b.isMine : undefined,
      status: b.status === 'REJECTED' ? 'REJECTED' : 'COMMITTED',
      errorCode: typeof b.errorCode === 'string' ? b.errorCode : undefined,
    };
  });

  const cover = [source.imageUrl, source.image].find(
    (url): url is string => typeof url === 'string' && Boolean(url.trim()),
  );
  const images = [...new Set([...(cover ? [cover] : []), ...(product?.images ?? [])])];
  if (!images.length) images.push('/images/nexus-product-placeholder.svg');

  const startingPrice =
    optionalNumber(source.startingPrice ?? source.startPrice) ??
    product?.price ??
    currentHighestBid ??
    0;
  const increment = Math.max(1, numberValue(source.bidIncrement ?? source.increment, 10_000));
  const highestBidderId =
    typeof source.highestBidderId === 'string' && source.highestBidderId.trim()
      ? source.highestBidderId.trim()
      : null;
  const effectiveCurrentBid = currentHighestBid ?? startingPrice;
  // Live BE PlaceBidUseCase currently requires currentHighestBid + bidIncrement even on the first bid.
  const computedNextMinBid =
    optionalNumber(source.nextMinBid) ??
    (effectiveCurrentBid > 0 ? effectiveCurrentBid + increment : startingPrice);

  const rawRules = row(source.effectiveRules);
  const rawModel =
    source.model3d && typeof source.model3d === 'object' ? row(source.model3d) : null;
  const rawSettlement =
    source.settlement && typeof source.settlement === 'object' ? row(source.settlement) : null;
  const fallbackWinnerAlias = highestBidderId
    ? `Buyer ••••${highestBidderId.slice(-4).toUpperCase()}`
    : null;

  const derivedSettlement: AuctionSettlementSummary | null = rawSettlement
    ? {
        outcome: (rawSettlement.outcome as AuctionSettlementSummary['outcome']) ?? 'PENDING',
        closedReason:
          typeof rawSettlement.closedReason === 'string'
            ? (rawSettlement.closedReason as AuctionSettlementSummary['closedReason'])
            : null,
        winnerId:
          typeof rawSettlement.winnerId === 'string' ? rawSettlement.winnerId : highestBidderId,
        winnerAlias:
          typeof rawSettlement.winnerAlias === 'string' && rawSettlement.winnerAlias.trim()
            ? rawSettlement.winnerAlias.trim()
            : fallbackWinnerAlias,
        winnerName:
          typeof rawSettlement.winnerName === 'string' && rawSettlement.winnerName.trim()
            ? rawSettlement.winnerName.trim()
            : null,
        finalPrice:
          optionalNumber(rawSettlement.winningBidAmount ?? rawSettlement.finalPrice) ??
          effectiveCurrentBid,
        winningBidAmount:
          optionalNumber(rawSettlement.winningBidAmount ?? rawSettlement.finalPrice) ??
          effectiveCurrentBid,
        settledAt: rawSettlement.settledAt ? timestamp(rawSettlement.settledAt, now) : actualEndAt,
        paymentDueAt: rawSettlement.paymentDueAt
          ? timestamp(rawSettlement.paymentDueAt, now)
          : null,
        orderId: typeof rawSettlement.orderId === 'string' ? rawSettlement.orderId : null,
        orderCode: typeof rawSettlement.orderCode === 'string' ? rawSettlement.orderCode : null,
        orderStatus:
          typeof rawSettlement.orderStatus === 'string' ? rawSettlement.orderStatus : null,
        paymentStatus:
          typeof rawSettlement.paymentStatus === 'string' ? rawSettlement.paymentStatus : null,
        paymentUrl: typeof rawSettlement.paymentUrl === 'string' ? rawSettlement.paymentUrl : null,
        lastSyncedAt: rawSettlement.lastSyncedAt
          ? timestamp(rawSettlement.lastSyncedAt, now)
          : null,
        canCheckout: Boolean(rawSettlement.canCheckout),
      }
    : status === 'ENDED'
      ? {
          outcome: highestBidderId ? 'WON' : 'NO_BIDS',
          winnerId: highestBidderId,
          winnerAlias: fallbackWinnerAlias,
          winnerName: null,
          finalPrice: highestBidderId ? effectiveCurrentBid : null,
          winningBidAmount: highestBidderId ? effectiveCurrentBid : null,
          settledAt: actualEndAt ?? endAt,
          canCheckout: Boolean(highestBidderId),
        }
      : null;

  const cancelledAt = source.cancelledAt ? timestamp(source.cancelledAt, now) : null;
  const cancelledBy =
    typeof source.cancelledBy === 'string' && source.cancelledBy.trim()
      ? source.cancelledBy.trim()
      : undefined;
  const cancelReason =
    typeof source.cancelReason === 'string'
      ? source.cancelReason
      : typeof source.publicCancelReason === 'string'
        ? source.publicCancelReason
        : undefined;

  const rawAudit = Array.isArray(source.auditTrail) ? source.auditTrail : null;
  const auditTrail: AuctionAuditEntry[] | undefined = rawAudit
    ? rawAudit.map((item, idx) => {
        const entry = row(item);
        return {
          id: String(entry.id ?? `${id}-audit-${idx}`),
          action: String(entry.action ?? 'UPDATE'),
          label: String(entry.label ?? entry.action ?? 'Cập nhật phiên'),
          timestamp: timestamp(entry.timestamp ?? entry.createdAt, now),
          actor: String(entry.actor ?? entry.actorId ?? 'Hệ thống'),
          actorRole: typeof entry.actorRole === 'string' ? entry.actorRole : undefined,
          detail: typeof entry.detail === 'string' ? entry.detail : undefined,
          internalNote: typeof entry.internalNote === 'string' ? entry.internalNote : undefined,
          publicReason: typeof entry.publicReason === 'string' ? entry.publicReason : undefined,
        };
      })
    : cancelledAt
      ? [
          {
            id: `${id}-cancelled`,
            action: 'AUCTION_CANCELLED',
            label: 'Hủy phiên đấu giá',
            timestamp: cancelledAt,
            actor: cancelledBy || 'Quản trị / Người bán',
            publicReason: cancelReason,
          },
        ]
      : undefined;

  return {
    id,
    productId,
    title:
      (typeof source.title === 'string' && source.title.trim()) ||
      (typeof source.productTitle === 'string' && source.productTitle) ||
      product?.title ||
      `Sản phẩm #${productId}`,
    image: images[0],
    images,
    model3d:
      rawModel && typeof rawModel.url === 'string' && rawModel.url
        ? {
            url: rawModel.url,
            poster: typeof rawModel.poster === 'string' ? rawModel.poster : images[0],
            label: typeof rawModel.label === 'string' ? rawModel.label : undefined,
            isIllustrative: Boolean(rawModel.isIllustrative),
          }
        : null,
    seller:
      (typeof source.sellerName === 'string' && source.sellerName) ||
      product?.sellerName ||
      (typeof source.sellerId === 'string' && source.sellerId) ||
      product?.sellerId ||
      'Người bán Nexus',
    sellerId:
      (typeof source.sellerId === 'string' && source.sellerId) || product?.sellerId || undefined,
    condition: product?.condition || 'Đang cập nhật',
    description:
      product?.description || 'Thông tin mô tả sản phẩm đang được đồng bộ từ Catalog Service.',
    startingPrice,
    increment,
    buyNowPrice: optionalNumber(source.buyNowPrice),
    nextMinBid: computedNextMinBid,
    startAt,
    endAt,
    originalEndAt,
    status,
    visibility:
      String(source.visibility ?? 'PUBLIC').toUpperCase() === 'RESTRICTED'
        ? 'RESTRICTED'
        : 'PUBLIC',
    version: numberValue(source.version, 1),
    bids: mappedBids,
    currentHighestBid,
    bidCount: bidCountValue == null ? null : numberValue(bidCountValue),
    bidHistoryAvailable: Array.isArray(source.bids),
    cancelReason,
    internalCancelNote:
      typeof source.internalCancelNote === 'string' ? source.internalCancelNote : undefined,
    extensionWindowSeconds:
      optionalNumber(
        rawRules.antiSnipingWindowSeconds ??
          rawRules.extensionWindowSeconds ??
          source.extensionWindowSeconds ??
          source.antiSnipingExtensionSeconds,
      ) ?? 120,
    extensionDurationSeconds:
      optionalNumber(
        rawRules.antiSnipingExtendSeconds ??
          rawRules.extensionDurationSeconds ??
          source.extensionDurationSeconds,
      ) ?? 300,
    maxExtensions: optionalNumber(rawRules.maxExtensions ?? source.maxExtensions) ?? 3,
    extensionsUsed: optionalNumber(source.extensionCount ?? source.extensionsUsed) ?? 0,
    paymentWindowHours:
      optionalNumber(
        rawRules.paymentDeadlineHours ?? rawRules.paymentWindowHours ?? source.paymentWindowHours,
      ) ?? 24,
    demoMode:
      typeof source.demoMode === 'boolean'
        ? source.demoMode
        : typeof rawRules.demoMode === 'boolean'
          ? Boolean(rawRules.demoMode)
          : startingPrice > 0 && startingPrice < 1000,
    demoMultiplier:
      optionalNumber(source.demoMultiplier ?? rawRules.demoMultiplier) ??
      (startingPrice > 0 && startingPrice < 1000 ? 1_000_000 : 1),
    createdByAdminId:
      typeof source.createdByAdminId === 'string' ? source.createdByAdminId : undefined,
    auditRef: typeof source.auditRef === 'string' ? source.auditRef : undefined,
    settlement: derivedSettlement,
    auditTrail,
  };
}

function notifyAuctionChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENT));
  }
}

async function readServerAuctions(): Promise<Auction[]> {
  const values = unwrap<unknown>(await requestApi('/auctions?status=ALL'));
  if (!Array.isArray(values))
    throw new ApiError('Danh sách phiên đấu chưa đúng định dạng.', undefined, 'INVALID_AUCTIONS');
  return Promise.all(values.map(mapServerAuction));
}

async function readServerAuction(id: string) {
  const raw = await requestApi('/auctions/' + encodeURIComponent(id));
  const value = unwrap<unknown>(raw);
  const auction = await mapServerAuction(value);
  const source = row(value);
  const serverTime = timestamp(source.serverTime, Date.now());
  return { auction, serverTime };
}

function isApiAuctionSource(): boolean {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_AUCTION_SOURCE === 'mock') {
    return false;
  }
  return appConfig.auctionSource === 'api';
}

export const auctionApi = {
  async list() {
    if (isApiAuctionSource()) return readServerAuctions();
    return (await read()).map((a) => ({ ...a, status: lifecycle(a) }));
  },
  async detail(id: string) {
    if (isApiAuctionSource()) return readServerAuction(id);
    const a = (await this.list()).find((a) => a.id === id);
    if (!a) throw new AuctionError('Không tìm thấy phiên đấu.', 'NOT_FOUND');
    return { auction: a, serverTime: Date.now() };
  },
  async products(): Promise<AuctionProductOption[]> {
    if (isApiAuctionSource()) {
      try {
        const page = await catalogApi.list({
          q: '',
          categoryId: '',
          minPrice: '',
          maxPrice: '',
          condition: '',
          sort: '',
          page: 1,
          pageSize: 100,
          scope: 'admin',
        });
        if (page.items.length > 0) {
          return page.items.map((item) => ({
            id: item.id,
            name: item.title,
            category: item.categoryId || 'tech',
            categoryName: item.categoryName || 'Sản phẩm',
            image: item.images[0] || '/images/nexus-product-placeholder.svg',
            imageAlt: item.title,
            mode: item.saleType === 'AUCTION' ? 'auction' : 'fixed',
            status: 'active',
            price: item.price ?? 0,
            startingPrice: item.price ?? 0,
            increment: 50_000,
            remainingSeconds: 0,
            bids: 0,
            condition: item.condition || 'Mới',
            seller: item.sellerName || item.sellerId || 'Người bán Nexus',
            sellerId: item.sellerId || undefined,
            reputation: 95,
            location: 'Việt Nam',
            description: item.description || '',
            history: [],
          }));
        }
      } catch {
        // Fallback to marketplace feed if catalog admin scope is unavailable
      }
    }
    return (await getMarketplaceFeed()).products;
  },
  async bid(id: string, amount: number, actor: Actor, version: number, key: string) {
    if (isApiAuctionSource()) {
      if (actor.role !== 'BUYER' || actor.status !== 'ACTIVE') {
        throw new AuctionError(
          'Chỉ tài khoản Người mua đang hoạt động mới có thể đặt giá.',
          'FORBIDDEN',
        );
      }
      const bidRaw = await requestApi(`/auctions/${encodeURIComponent(id)}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
        },
        body: JSON.stringify({
          bidAmount: amount,
          expectedVersion: version,
        }),
      });
      notifyAuctionChanged();
      try {
        const { auction } = await readServerAuction(id);
        return auction;
      } catch {
        // G01: POST đã thành công nhưng lần đọc sau lỗi -> trả bản ghi biên nhận để không báo thất bại giả
        const receipt = row(unwrap<unknown>(bidRaw));
        const fallback = await mapServerAuction({
          id,
          currentHighestBid: receipt.currentHighestBid ?? amount,
          highestBidAmount: receipt.highestBidAmount ?? amount,
          nextMinBid: receipt.nextMinBid,
          status: receipt.status ?? 'ACTIVE',
          endTime: receipt.endTime,
          version: receipt.version ?? version + 1,
          bidCount: receipt.bidCount ?? 1,
          bids: [
            {
              id: String(receipt.bidId ?? key),
              bidder: actor.id,
              displayAlias: 'Bạn',
              isMine: true,
              amount,
              time: Date.now(),
            },
          ],
        });
        return fallback;
      }
    }
    return mutation(async () => {
      const rows = await read(),
        i = rows.findIndex((a) => a.id === id);
      if (i < 0) throw new AuctionError('Không tìm thấy phiên đấu.', 'NOT_FOUND');
      const next = acceptBid(rows[i], amount, actor, version, key);
      rows[i] = next;
      save(rows);
      return next;
    });
  },
  async buyNow(id: string): Promise<Auction> {
    if (!isApiAuctionSource()) {
      throw new AuctionError('Mua ngay chỉ hỗ trợ khi kết nối API thực.', 'UNSUPPORTED');
    }
    await requestApi(`/auctions/${encodeURIComponent(id)}/buy-now`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    notifyAuctionChanged();
    const { auction } = await readServerAuction(id);
    return auction;
  },
  async checkout(
    id: string,
    shippingAddress: AuctionCheckoutAddress,
    idempotencyKey?: string,
  ): Promise<AuctionCheckoutResult> {
    if (!isApiAuctionSource()) {
      throw new AuctionError('Chốt đơn đấu giá chỉ hỗ trợ khi kết nối API thực.', 'UNSUPPORTED');
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    const raw = await requestApi(`/auctions/${encodeURIComponent(id)}/checkout`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ shippingAddress }),
    });
    const result = unwrap<AuctionCheckoutResult>(raw);
    notifyAuctionChanged();
    return result;
  },
  async save(input: AuctionInput, id?: string, version?: number, actor?: Actor) {
    assertAuctionAdmin(actor, id ? 'AUCTION.UPDATE' : 'AUCTION.CREATE');
    if (isApiAuctionSource()) {
      validateAuction(input);
      if (id) {
        await requestApi(`/auctions/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: input.title || undefined,
            bidIncrement: input.increment,
            buyNowPrice: input.buyNowPrice ?? undefined,
            visibility: input.visibility ?? 'PUBLIC',
            startTime: new Date(input.startAt).toISOString(),
            endTime: new Date(input.endAt).toISOString(),
          }),
        });
        notifyAuctionChanged();
        const { auction } = await readServerAuction(id);
        return auction;
      }

      const raw = await requestApi('/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: input.productId,
          sellerId: input.sellerId || undefined,
          title: input.title || undefined,
          startPrice: input.startingPrice,
          bidStep: input.increment,
          buyNowPrice: input.buyNowPrice ?? undefined,
          visibility: input.visibility ?? 'PUBLIC',
          demoMode: input.demoMode,
          demoMultiplier: input.demoMultiplier,
          startTime: new Date(input.startAt).toISOString(),
          endTime: new Date(input.endAt).toISOString(),
        }),
      });
      const created = row(unwrap<unknown>(raw));
      const createdId = String(created.id ?? '');
      notifyAuctionChanged();
      if (createdId) {
        const { auction } = await readServerAuction(createdId);
        return auction;
      }
      return mapServerAuction(created);
    }
    return mutation(async () => {
      validateAuction(input);
      const rows = await read(),
        existing = id ? rows.find((a) => a.id === id) : undefined;
      if (id && !existing) throw new AuctionError('Không tìm thấy phiên đấu.', 'NOT_FOUND');
      if (existing && (lifecycle(existing) !== 'SCHEDULED' || existing.version !== version))
        throw new AuctionError('Chỉ sửa phiên chưa bắt đầu và chưa có thay đổi mới.', 'CONFLICT');
      if (
        rows.some(
          (a) =>
            a.id !== id &&
            a.productId === input.productId &&
            ['SCHEDULED', 'ACTIVE', 'EXTENDED'].includes(lifecycle(a)),
        )
      )
        throw new AuctionError(
          'Sản phẩm đã có một phiên sắp diễn ra hoặc đang diễn ra.',
          'CONFLICT',
        );
      const product = (await this.products()).find((p) => p.id === input.productId);
      if (!product) throw new AuctionError('Sản phẩm không còn khả dụng.', 'VALIDATION');
      const item: Auction = {
        ...input,
        id: existing?.id ?? 'auction-' + crypto.randomUUID(),
        title: product.name,
        image: product.image,
        images: [product.image],
        seller: product.seller,
        condition: product.condition,
        description: `Thông tin ${product.name.toLowerCase()}.`,
        originalEndAt: input.endAt,
        status: 'SCHEDULED',
        visibility: input.visibility ?? 'PUBLIC',
        version: (existing?.version ?? 0) + 1,
        extensionWindowSeconds: 300,
        extensionDurationSeconds: 300,
        maxExtensions: 5,
        extensionsUsed: 0,
        paymentWindowHours: 24,
        bids: [],
      };
      save(existing ? rows.map((a) => (a.id === id ? item : a)) : [item, ...rows]);
      return item;
    });
  },
  async cancel(
    id: string,
    reason: string,
    version: number,
    actor?: Actor,
    options?: { publicReason?: string; internalNote?: string },
  ) {
    assertAuctionAdmin(actor, 'AUCTION.ADMIN_CANCEL');
    if (!reason.trim() || reason.length > 500)
      throw new AuctionError('Nhập lý do hủy phiên (1–500 ký tự).', 'VALIDATION');
    if (isApiAuctionSource()) {
      await requestApi(`/auctions/${encodeURIComponent(id)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason.trim(),
          publicReason: options?.publicReason?.trim() || undefined,
          internalNote: options?.internalNote?.trim() || undefined,
        }),
      });
      notifyAuctionChanged();
      return;
    }
    return mutation(async () => {
      const rows = await read(),
        a = rows.find((a) => a.id === id);
      if (!a) throw new AuctionError('Không tìm thấy phiên đấu.', 'NOT_FOUND');
      if (!['SCHEDULED', 'ACTIVE', 'EXTENDED'].includes(lifecycle(a)) || a.version !== version)
        throw new AuctionError('Phiên đã thay đổi hoặc không thể hủy.', 'CONFLICT');
      save(
        rows.map((r) =>
          r.id === id
            ? { ...r, status: 'CANCELLED', cancelReason: reason.trim(), version: r.version + 1 }
            : r,
        ),
      );
    });
  },
  subscribe(listener: () => void) {
    if (typeof window === 'undefined') return () => undefined;
    window.addEventListener(EVENT, listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === KEY) listener();
    };
    if (!isApiAuctionSource()) {
      window.addEventListener('storage', onStorage);
    }
    return () => {
      window.removeEventListener(EVENT, listener);
      if (!isApiAuctionSource()) {
        window.removeEventListener('storage', onStorage);
      }
    };
  },
};
