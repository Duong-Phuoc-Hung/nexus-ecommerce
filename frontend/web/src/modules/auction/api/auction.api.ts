import { getMarketplaceFeed } from '../../home/api/marketplace.api';
import { appConfig } from '../../../configs/app.config';
import { requestApi } from '../../../lib/axios/api-client';
import { ApiError, unwrap } from '../../../lib/axios/http';
import { catalogApi } from '../../catalog/api/catalog.api';
export type AuctionStatus = 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
export type AuctionBid = { id: string; bidder: string; amount: number; time: number; key?: string };
export type Auction = {
  id: string;
  productId: string;
  title: string;
  image: string;
  seller: string;
  condition: string;
  description: string;
  startingPrice: number;
  increment: number;
  startAt: number;
  endAt: number;
  status: AuctionStatus;
  version: number;
  bids: AuctionBid[];
  currentHighestBid?: number | null;
  bidCount?: number | null;
  bidHistoryAvailable?: boolean;
  cancelReason?: string;
};
export type AuctionInput = {
  productId: string;
  startingPrice: number;
  increment: number;
  startAt: number;
  endAt: number;
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
  ENDED: 'Đã kết thúc',
  CANCELLED: 'Đã hủy',
};
export class AuctionError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}
export function currentPrice(a: Auction) {
  return a.currentHighestBid ?? a.bids[0]?.amount ?? a.startingPrice;
}
export function nextPrice(a: Auction) {
  return a.currentHighestBid != null || a.bids.length
    ? currentPrice(a) + a.increment
    : a.startingPrice;
}
export function lifecycle(a: Auction, now = Date.now()): AuctionStatus {
  return a.status === 'CANCELLED'
    ? 'CANCELLED'
    : now >= a.endAt
      ? 'ENDED'
      : now >= a.startAt
        ? 'ACTIVE'
        : 'SCHEDULED';
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
  if (!Number.isFinite(input.startAt) || input.startAt <= now)
    throw new AuctionError('Giờ bắt đầu phải ở tương lai.', 'VALIDATION');
  const duration = input.endAt - input.startAt;
  if (!Number.isFinite(duration) || duration < 3600000 || duration > 168 * 3600000)
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
  if (lifecycle(a, now) !== 'ACTIVE')
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
    bids: [{ id: key, key, bidder: actor.id, amount, time: now }, ...a.bids],
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
      seller: p.seller,
      condition: p.condition,
      description: `Khám phá ${p.name.toLowerCase()}. Xem kỹ tình trạng, mức giá và thời gian trước khi tham gia.`,
      startingPrice: p.startingPrice,
      increment: p.increment,
      startAt: p.status === 'active' ? now - 3600000 : now + 3600000,
      endAt:
        p.status === 'active' ? now + Math.max(3600, p.remainingSeconds) * 1000 : now + 86400000,
      status: p.status === 'active' ? 'ACTIVE' : 'SCHEDULED',
      version: 1,
      bids:
        p.status === 'active'
          ? [
              {
                id: 'opening-' + p.id,
                bidder: 'Người tham gia •128',
                amount: p.price,
                time: now - 60000,
              },
            ]
          : [],
    }));
  // Keep a finished example for result/empty-history UI, separate from live items.
  if (rows[0])
    rows.push({
      ...rows[0],
      id: 'NX-CLOSED',
      startAt: now - 86400000,
      endAt: now - 3600000,
      status: 'ENDED',
      bids: [],
    });
  // Recheck after async seed generation so another tab's data is not overwritten.
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
  return fn(); // Single-tab fallback; not a distributed bid engine.
}
function row(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}
function numberValue(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function timestamp(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}
async function mapServerAuction(value: unknown): Promise<Auction> {
  const source = row(value);
  const productId = String(source.productId ?? '');
  const id = String(source.id ?? '');
  if (!id || !productId)
    throw new ApiError('Phiên đấu thiếu mã phiên hoặc mã sản phẩm.', undefined, 'INVALID_AUCTION');
  const product = await catalogApi.detail(productId);
  const now = Date.now();
  const currentHighestBid =
    source.currentHighestBid == null ? null : numberValue(source.currentHighestBid);
  const statusValue = String(source.status ?? 'ACTIVE').toUpperCase();
  const status: AuctionStatus = ['ACTIVE', 'SCHEDULED', 'ENDED', 'CANCELLED'].includes(statusValue)
    ? (statusValue as AuctionStatus)
    : 'ACTIVE';
  const endAt = timestamp(source.endTime ?? source.endAt, now);
  const bidCountValue = source.bidCount ?? source.totalBids;
  return {
    id,
    productId,
    title: product.title,
    image: product.images[0] || '/images/nexus-product-placeholder.svg',
    seller: product.sellerName || product.sellerId || 'Người bán Nexus',
    condition: product.condition || 'Đang cập nhật',
    description: product.description,
    startingPrice: product.price ?? currentHighestBid ?? 0,
    increment: Math.max(1, numberValue(source.bidIncrement, 1)),
    startAt: timestamp(source.startTime ?? source.startAt, status === 'SCHEDULED' ? endAt : now),
    endAt,
    status,
    version: numberValue(source.version, 1),
    bids: [],
    currentHighestBid,
    bidCount: bidCountValue == null ? null : numberValue(bidCountValue),
    bidHistoryAvailable: Array.isArray(source.bids),
  };
}
async function readServerAuctions(): Promise<Auction[]> {
  const values = unwrap<unknown>(await requestApi('/auctions'));
  if (!Array.isArray(values))
    throw new ApiError('Danh sách phiên đấu chưa đúng định dạng.', undefined, 'INVALID_AUCTIONS');
  return Promise.all(values.map(mapServerAuction));
}
async function readServerAuction(id: string) {
  const value = unwrap<unknown>(await requestApi('/auctions/' + encodeURIComponent(id)));
  const auction = await mapServerAuction(value);
  return { auction, serverTime: Date.now() };
}
export const auctionApi = {
  async list() {
    if (appConfig.auctionSource === 'api') return readServerAuctions();
    return (await read()).map((a) => ({ ...a, status: lifecycle(a) }));
  },
  async detail(id: string) {
    if (appConfig.auctionSource === 'api') return readServerAuction(id);
    const a = (await this.list()).find((a) => a.id === id);
    if (!a) throw new AuctionError('Không tìm thấy phiên đấu.', 'NOT_FOUND');
    return { auction: a, serverTime: Date.now() };
  },
  async products() {
    return (await getMarketplaceFeed()).products;
  },
  async bid(id: string, amount: number, actor: Actor, version: number, key: string) {
    if (appConfig.auctionSource === 'api')
      throw new AuctionError(
        'Backend chưa hoàn thiện xử lý đặt giá; yêu cầu chưa được gửi.',
        'BIDDING_UNAVAILABLE',
      );
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
  async save(input: AuctionInput, id?: string, version?: number, actor?: Actor) {
    if (appConfig.auctionSource === 'api')
      throw new AuctionError(
        'Backend chưa cung cấp API tạo hoặc sửa phiên đấu.',
        'AUCTION_MANAGEMENT_UNAVAILABLE',
      );
    assertAuctionAdmin(actor, id ? 'AUCTION.UPDATE' : 'AUCTION.CREATE');
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
            ['SCHEDULED', 'ACTIVE'].includes(lifecycle(a)),
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
        seller: product.seller,
        condition: product.condition,
        description: `Thông tin ${product.name.toLowerCase()}.`,
        status: 'SCHEDULED',
        version: (existing?.version ?? 0) + 1,
        bids: [],
      };
      save(existing ? rows.map((a) => (a.id === id ? item : a)) : [item, ...rows]);
      return item;
    });
  },
  async cancel(id: string, reason: string, version: number, actor?: Actor) {
    if (appConfig.auctionSource === 'api')
      throw new AuctionError(
        'Backend chưa cung cấp API hủy phiên đấu.',
        'AUCTION_MANAGEMENT_UNAVAILABLE',
      );
    assertAuctionAdmin(actor, 'AUCTION.ADMIN_CANCEL');
    return mutation(async () => {
      const rows = await read(),
        a = rows.find((a) => a.id === id);
      if (!a) throw new AuctionError('Không tìm thấy phiên đấu.', 'NOT_FOUND');
      if (!reason.trim() || reason.length > 500)
        throw new AuctionError('Nhập lý do hủy phiên.', 'VALIDATION');
      if (!['SCHEDULED', 'ACTIVE'].includes(lifecycle(a)) || a.version !== version)
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
    if (appConfig.auctionSource === 'api') return () => undefined;
    window.addEventListener(EVENT, listener);
    window.addEventListener('storage', listener);
    return () => {
      window.removeEventListener(EVENT, listener);
      window.removeEventListener('storage', listener);
    };
  },
};
