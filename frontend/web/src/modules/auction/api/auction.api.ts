import { getMarketplaceFeed } from '../../home/api/marketplace.api';
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
  cancelReason?: string;
};
export type AuctionInput = {
  productId: string;
  startingPrice: number;
  increment: number;
  startAt: number;
  endAt: number;
};
export type Actor = { id: string; role: string; status: string };
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
  return a.bids[0]?.amount ?? a.startingPrice;
}
export function nextPrice(a: Auction) {
  return a.bids.length ? currentPrice(a) + a.increment : a.startingPrice;
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
  if (actor.role !== 'BUYER' || actor.status !== 'ACTIVE')
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
export const auctionApi = {
  async list() {
    return (await read()).map((a) => ({ ...a, status: lifecycle(a) }));
  },
  async detail(id: string) {
    const a = (await this.list()).find((a) => a.id === id);
    if (!a) throw new AuctionError('Không tìm thấy phiên đấu.', 'NOT_FOUND');
    return { auction: a, serverTime: Date.now() };
  },
  async products() {
    return (await getMarketplaceFeed()).products;
  },
  async bid(id: string, amount: number, actor: Actor, version: number, key: string) {
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
  async save(input: AuctionInput, id?: string, version?: number) {
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
  async cancel(id: string, reason: string, version: number) {
    return mutation(async () => {
      const rows = await read(),
        a = rows.find((a) => a.id === id);
      if (!a) throw new AuctionError('Không tìm thấy phiên đấu.', 'NOT_FOUND');
      if (!reason.trim()) throw new AuctionError('Nhập lý do hủy phiên.', 'VALIDATION');
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
    window.addEventListener(EVENT, listener);
    window.addEventListener('storage', listener);
    return () => {
      window.removeEventListener(EVENT, listener);
      window.removeEventListener('storage', listener);
    };
  },
};
