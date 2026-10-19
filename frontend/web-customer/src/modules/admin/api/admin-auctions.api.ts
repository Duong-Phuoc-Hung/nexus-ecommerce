import { unwrap, type RequestApi } from '../../../../../shared/http';
import { requestApi } from '../../../services/api-client';

export type AdminAuctionStatus = 'UPCOMING' | 'ACTIVE' | 'EXTENDED' | 'ENDED' | 'CANCELLED';
export type AdminAuction = {
  id: string;
  productId: string;
  currentHighestBid: number | null;
  status: AdminAuctionStatus;
  endTime: string | null;
};

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
  const bid = Number(row.currentHighestBid);
  return {
    id: String(row.id),
    productId: String(row.productId),
    currentHighestBid: Number.isFinite(bid) ? bid : null,
    status,
    endTime: typeof row.endTime === 'string' ? row.endTime : null,
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
