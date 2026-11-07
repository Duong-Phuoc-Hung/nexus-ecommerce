import { requestApi } from '@/lib/axios/api-client';
import { unwrap } from '@/lib/axios/http';

export type BackendAuction = {
  id: string;
  productId: string;
  sellerId?: string;
  title: string;
  startingPrice: number;
  currentHighestBid?: number;
  highestBidderId?: string;
  bidIncrement: number;
  buyNowPrice?: number;
  status: string; // 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'CANCELLED'
  startTime: string;
  endTime: string;
  actualEndTime?: string;
  createdAt?: string;
  bids?: any[];
};

export type CreateAuctionInput = {
  productId: string;
  sellerId?: string;
  title?: string;
  startPrice: number;
  bidStep?: number;
  buyNowPrice?: number;
  startTime: string; // ISO string
  endTime: string; // ISO string
  antiSnipingExtensionSeconds?: number;
};

export const sellerAuctionsApi = {
  /**
   * Lấy danh sách các phiên đấu giá (có bộ lọc theo status, sellerId)
   * GET /api/v1/auctions
   */
  list: async (
    params?: { status?: string; sellerId?: string },
    signal?: AbortSignal,
  ): Promise<BackendAuction[]> => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.sellerId) query.append('sellerId', params.sellerId);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const raw = await requestApi<{ success: boolean; data: BackendAuction[] }>(`/auctions${qs}`, {
      signal,
    });
    const data = unwrap<BackendAuction[]>(raw);
    return Array.isArray(data) ? data : [];
  },

  /**
   * Xem chi tiết 1 phòng đấu giá
   * GET /api/v1/auctions/:id
   */
  getById: async (id: string, signal?: AbortSignal): Promise<BackendAuction> => {
    const raw = await requestApi<{ success: boolean; data: BackendAuction }>(
      `/auctions/${encodeURIComponent(id)}`,
      {
        signal,
      },
    );
    return unwrap<BackendAuction>(raw);
  },

  /**
   * Tạo phòng đấu giá mới cho sản phẩm trong kho của người bán
   * POST /api/v1/auctions
   */
  create: async (payload: CreateAuctionInput, signal?: AbortSignal): Promise<BackendAuction> => {
    const raw = await requestApi<{
      success: boolean;
      message: string;
      data: BackendAuction;
    }>('/auctions', {
      method: 'POST',
      body: payload,
      signal,
    });
    return unwrap<BackendAuction>(raw);
  },

  /**
   * Lấy lịch sử các lượt trả giá của phòng đấu giá
   * GET /api/v1/auctions/:id/bids
   */
  getBidHistory: async (id: string, signal?: AbortSignal): Promise<any[]> => {
    const raw = await requestApi<{ success: boolean; data: any[] }>(
      `/auctions/${encodeURIComponent(id)}/bids`,
      {
        signal,
      },
    );
    const data = unwrap<any[]>(raw);
    return Array.isArray(data) ? data : [];
  },

  /**
   * Chỉnh sửa thông tin phòng đấu giá (chỉ khi chưa bắt đầu - SCHEDULED)
   * PUT /api/v1/auctions/:id
   */
  update: async (
    id: string,
    payload: {
      title?: string;
      bidIncrement?: number;
      buyNowPrice?: number;
      startTime?: string;
      endTime?: string;
    },
    signal?: AbortSignal,
  ): Promise<BackendAuction> => {
    const raw = await requestApi<{
      success: boolean;
      message: string;
      data: BackendAuction;
    }>(`/auctions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: payload,
      signal,
    });
    return unwrap<BackendAuction>(raw);
  },

  /**
   * Đặt giá thầu cho phiên đấu giá (có Anti-sniping)
   * POST /api/v1/auctions/:id/bids
   */
  placeBid: async (
    id: string,
    bidAmount: number,
    signal?: AbortSignal,
  ): Promise<{
    auctionId: string;
    bidderId: string;
    bidAmount: number;
    isExtended: boolean;
    endTime: string;
  }> => {
    const raw = await requestApi<{
      success: boolean;
      message: string;
      data: {
        auctionId: string;
        bidderId: string;
        bidAmount: number;
        isExtended: boolean;
        endTime: string;
      };
    }>(`/auctions/${encodeURIComponent(id)}/bids`, {
      method: 'POST',
      body: { bidAmount },
      signal,
    });
    return unwrap<{
      auctionId: string;
      bidderId: string;
      bidAmount: number;
      isExtended: boolean;
      endTime: string;
    }>(raw);
  },

  /**
   * Mua thẳng (Buy It Now) kết thúc phiên ngay lập tức
   * POST /api/v1/auctions/:id/buy-now
   */
  buyNow: async (
    id: string,
    signal?: AbortSignal,
  ): Promise<{
    auctionId: string;
    buyerId: string;
    buyNowPrice: number;
    status: string;
    endedAt: string;
  }> => {
    const raw = await requestApi<{
      success: boolean;
      message: string;
      data: {
        auctionId: string;
        buyerId: string;
        buyNowPrice: number;
        status: string;
        endedAt: string;
      };
    }>(`/auctions/${encodeURIComponent(id)}/buy-now`, {
      method: 'POST',
      body: {},
      signal,
    });
    return unwrap<{
      auctionId: string;
      buyerId: string;
      buyNowPrice: number;
      status: string;
      endedAt: string;
    }>(raw);
  },

  /**
   * Hủy phòng đấu giá (dành cho chủ phiên hoặc Admin)
   * DELETE /api/v1/auctions/:id
   */
  cancel: async (
    id: string,
    reason?: string,
    signal?: AbortSignal,
  ): Promise<{ auctionId: string; status: string; message: string }> => {
    const raw = await requestApi<{
      success: boolean;
      message: string;
      data: { auctionId: string; status: string; message: string };
    }>(`/auctions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: { reason },
      signal,
    });
    return unwrap<{ auctionId: string; status: string; message: string }>(raw);
  },
};
