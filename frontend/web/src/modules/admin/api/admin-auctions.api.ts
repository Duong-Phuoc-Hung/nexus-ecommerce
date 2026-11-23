import { unwrap, type RequestApi } from '../../../lib/axios/http';
import { requestApi } from '../../../lib/axios/api-client';

export type AdminAuctionStatus = 'UPCOMING' | 'ACTIVE' | 'EXTENDED' | 'ENDED' | 'CANCELLED';

export type AdminAuction = {
  id: string;
  productId: string;
  productTitle: string | null;
  sellerName: string | null;
  sellerId: string | null;
  startingPrice: number | null;
  currentHighestBid: number | null;
  bidIncrement: number | null;
  bidCount: number | null;
  status: AdminAuctionStatus;
  startTime: string | null;
  endTime: string | null;
  originalEndTime: string | null;
  settlementStatus: string | null;
  orderId: string | null;
  visibility: 'PUBLIC' | 'RESTRICTED';
  version: number;
};

function optionalNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeAuction(value: unknown): AdminAuction {
  if (!value || typeof value !== 'object') throw new Error('Thông tin phiên đấu không hợp lệ.');
  const row = value as Record<string, unknown>;
  if (!row.id || !row.productId) throw new Error('Phiên đấu thiếu mã phiên hoặc mã sản phẩm.');
  const rawStatus = String(row.status ?? '').toUpperCase();
  const status: AdminAuctionStatus =
    rawStatus === 'ACTIVE' ||
    rawStatus === 'EXTENDED' ||
    rawStatus === 'ENDED' ||
    rawStatus === 'CANCELLED'
      ? rawStatus
      : 'UPCOMING';
  return {
    id: String(row.id),
    productId: String(row.productId),
    productTitle: typeof row.productTitle === 'string' ? row.productTitle : null,
    sellerName: typeof row.sellerName === 'string' ? row.sellerName : null,
    sellerId: typeof row.sellerId === 'string' ? row.sellerId : null,
    startingPrice: optionalNum(row.startingPrice ?? row.startPrice),
    currentHighestBid: optionalNum(row.currentHighestBid ?? row.highestBidAmount),
    bidIncrement: optionalNum(row.bidIncrement ?? row.increment),
    bidCount: optionalNum(row.bidCount ?? row.totalBids),
    status,
    startTime:
      typeof row.startTime === 'string'
        ? row.startTime
        : typeof row.startsAt === 'string'
          ? row.startsAt
          : null,
    endTime:
      typeof row.effectiveEndsAt === 'string'
        ? row.effectiveEndsAt
        : typeof row.endTime === 'string'
          ? row.endTime
          : null,
    originalEndTime: typeof row.originalEndTime === 'string' ? row.originalEndTime : null,
    settlementStatus:
      typeof row.settlementStatus === 'string'
        ? row.settlementStatus
        : row.settlement && typeof (row.settlement as Record<string, unknown>).outcome === 'string'
          ? String((row.settlement as Record<string, unknown>).outcome)
          : null,
    orderId:
      typeof row.orderId === 'string'
        ? row.orderId
        : row.settlement && typeof (row.settlement as Record<string, unknown>).orderId === 'string'
          ? String((row.settlement as Record<string, unknown>).orderId)
          : null,
    visibility:
      String(row.visibility ?? 'PUBLIC').toUpperCase() === 'RESTRICTED' ? 'RESTRICTED' : 'PUBLIC',
    version: optionalNum(row.version) ?? 1,
  };
}

export function createAdminAuctionsApi(request: RequestApi) {
  return {
    async list(signal?: AbortSignal): Promise<AdminAuction[]> {
      const payload = unwrap<unknown>(await request('/auctions', { signal }));
      if (!Array.isArray(payload)) throw new Error('Danh sách phiên đấu chưa đúng định dạng.');
      return payload.map(normalizeAuction);
    },
  };
}

export const adminAuctionsApi = createAdminAuctionsApi(requestApi);
