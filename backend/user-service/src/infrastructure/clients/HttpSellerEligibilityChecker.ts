import {
  ISellerEligibilityChecker,
  SellerEligibilityBlocker,
  SellerEligibilityCheckResult,
} from '../../application/ports/ISellerEligibilityChecker';

export interface MockOrderObligation {
  orderId: string;
  orderNumber?: string;
  buyerId: string;
  status:
    | 'PENDING'
    | 'PENDING_PAYMENT'
    | 'CREATED'
    | 'PAID'
    | 'PROCESSING'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'REFUNDED'
    | 'REFUND_REQUESTED'
    | 'DISPUTED';
  totalAmount?: number;
}

export interface MockAuctionObligation {
  auctionId: string;
  title?: string;
  bidderId: string;
  type: 'LEADING_ACTIVE_AUCTION' | 'PARTICIPATING_ACTIVE_AUCTION' | 'UNSETTLED_WON_AUCTION';
}

const TERMINAL_ORDER_STATUSES = new Set(['COMPLETED', 'DELIVERED', 'CANCELLED', 'REFUNDED']);

export class HttpSellerEligibilityChecker implements ISellerEligibilityChecker {
  private commerceBaseUrl: string;
  private auctionBaseUrl: string;
  private timeoutMs: number;

  private mockOrders: Map<string, MockOrderObligation[]> = new Map();
  private mockAuctions: Map<string, MockAuctionObligation[]> = new Map();
  private mockCheckoutReservations: Set<string> = new Set();
  private simulateServiceFailure: boolean = false;

  constructor(options?: { commerceBaseUrl?: string; auctionBaseUrl?: string; timeoutMs?: number }) {
    this.commerceBaseUrl =
      options?.commerceBaseUrl || process.env.COMMERCE_SERVICE_URL || 'http://localhost:4003';
    this.auctionBaseUrl =
      options?.auctionBaseUrl || process.env.AUCTION_SERVICE_URL || 'http://localhost:4004';
    this.timeoutMs = options?.timeoutMs ?? 4000;
  }

  public setSimulateServiceFailure(failed: boolean): void {
    this.simulateServiceFailure = failed;
  }

  public setUserOrderObligations(userId: string, orders: MockOrderObligation[]): void {
    this.mockOrders.set(userId, [...orders]);
  }

  public setUserAuctionObligations(userId: string, auctions: MockAuctionObligation[]): void {
    this.mockAuctions.set(userId, [...auctions]);
  }

  public addCheckoutReservation(userId: string): void {
    this.mockCheckoutReservations.add(userId);
  }

  public hasCheckoutReservation(userId: string): boolean {
    return this.mockCheckoutReservations.has(userId);
  }

  public clearMockState(): void {
    this.mockOrders.clear();
    this.mockAuctions.clear();
    this.mockCheckoutReservations.clear();
    this.simulateServiceFailure = false;
  }

  async checkObligations(
    userId: string,
    options?: { authHeader?: string; simulateUnavailable?: boolean },
  ): Promise<SellerEligibilityCheckResult> {
    const checkedAt = new Date().toISOString();

    if (this.simulateServiceFailure || options?.simulateUnavailable) {
      return {
        eligible: false,
        serviceAvailable: false,
        checkedAt,
        blockers: [
          {
            code: 'OBLIGATION_SERVICE_UNAVAILABLE',
            message:
              'Hệ thống đơn hàng hoặc đấu giá đang tạm thời gián đoạn. Vui lòng bấm "Kiểm tra lại" sau ít phút.',
            referenceType: 'ACCOUNT',
            referenceLabel: 'Kiểm tra lại điều kiện',
          },
        ],
      };
    }

    const blockers: SellerEligibilityBlocker[] = [];

    // 1. Check in-memory registered obligations first
    const registeredOrders = this.mockOrders.get(userId) || [];
    this.appendOrderBlockers(registeredOrders, blockers);

    const registeredAuctions = this.mockAuctions.get(userId) || [];
    this.appendAuctionBlockers(registeredAuctions, blockers);

    // 2. Check live Commerce & Auction services over HTTP when available
    const strictExternal =
      process.env.STRICT_EXTERNAL_OBLIGATION_SERVICES === 'true' ||
      (process.env.USE_IN_MEMORY_DB !== 'true' &&
        process.env.STRICT_EXTERNAL_OBLIGATION_SERVICES !== 'false');

    const [commerceOutcome, auctionOutcome] = await Promise.all([
      this.fetchCommerceObligations(userId, options?.authHeader),
      this.fetchAuctionObligations(userId, options?.authHeader),
    ]);

    if (commerceOutcome.hardFailure || auctionOutcome.hardFailure) {
      return {
        eligible: false,
        serviceAvailable: false,
        checkedAt,
        blockers: [
          {
            code: 'OBLIGATION_SERVICE_UNAVAILABLE',
            message:
              'Một hoặc nhiều dịch vụ kiểm tra nghĩa vụ giao dịch phản hồi lỗi hoặc quá thời gian chờ. Hệ thống không tự động cho phép kích hoạt để đảm bảo an toàn tài khoản.',
            referenceType: 'ACCOUNT',
            referenceLabel: 'Kiểm tra lại điều kiện',
          },
        ],
      };
    }

    if (strictExternal && (!commerceOutcome.reachable || !auctionOutcome.reachable)) {
      return {
        eligible: false,
        serviceAvailable: false,
        checkedAt,
        blockers: [
          {
            code: 'OBLIGATION_SERVICE_UNAVAILABLE',
            message: 'Không thể kết nối tới dịch vụ đơn hàng hoặc đấu giá. Vui lòng thử lại sau.',
            referenceType: 'ACCOUNT',
            referenceLabel: 'Kiểm tra lại điều kiện',
          },
        ],
      };
    }

    for (const b of commerceOutcome.blockers) {
      if (
        !blockers.some(
          (existing) => existing.code === b.code && existing.referenceId === b.referenceId,
        )
      ) {
        blockers.push(b);
      }
    }

    for (const b of auctionOutcome.blockers) {
      if (
        !blockers.some(
          (existing) => existing.code === b.code && existing.referenceId === b.referenceId,
        )
      ) {
        blockers.push(b);
      }
    }

    const eligible = blockers.length === 0;
    return {
      eligible,
      serviceAvailable: true,
      checkedAt,
      blockers,
    };
  }

  async releaseOpenCheckoutReservations(userId: string): Promise<void> {
    this.mockCheckoutReservations.delete(userId);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      await fetch(
        `${this.commerceBaseUrl}/api/v1/checkout/reservations/${encodeURIComponent(userId)}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
            'x-user-role': 'BUYER',
          },
          signal: controller.signal,
        },
      );
      clearTimeout(timer);
    } catch {
      // Safe no-op if commerce-service reservation endpoint is not active
    }
  }

  private appendOrderBlockers(
    orders: MockOrderObligation[],
    blockers: SellerEligibilityBlocker[],
  ): void {
    for (const order of orders) {
      const status = String(order.status || '').toUpperCase();
      if (TERMINAL_ORDER_STATUSES.has(status)) {
        continue;
      }

      const displayCode = order.orderNumber || `#${order.orderId.slice(0, 8)}`;

      if (status === 'DISPUTED') {
        blockers.push({
          code: 'OPEN_DISPUTE',
          message: `Đơn hàng ${displayCode} đang có khiếu nại / tranh chấp mở. Bạn cần hoàn tất xử lý khiếu nại trước khi chuyển sang tài khoản Seller.`,
          referenceType: 'SUPPORT',
          referenceId: order.orderId,
          referenceLabel: `Xem đơn hàng ${displayCode}`,
        });
      } else if (status === 'REFUND_REQUESTED' || status === 'PENDING_PAYMENT') {
        blockers.push({
          code: 'UNSETTLED_PAYMENT_OR_REFUND',
          message: `Đơn hàng ${displayCode} chưa hoàn tất thanh toán / hoàn tiền (${status}). Vui lòng hoàn tất thanh toán hoặc đợi đối soát hoàn tiền xong trước khi kích hoạt Seller.`,
          referenceType: 'ORDER',
          referenceId: order.orderId,
          referenceLabel: `Xem đơn hàng ${displayCode}`,
        });
      } else {
        blockers.push({
          code: 'OPEN_BUYER_ORDER',
          message: `Đơn mua hàng ${displayCode} đang mở (${status}). Hệ thống không tự hủy đơn của bạn — vui lòng hoàn tất hoặc xử lý đơn hàng này trước.`,
          referenceType: 'ORDER',
          referenceId: order.orderId,
          referenceLabel: `Xem đơn hàng ${displayCode}`,
        });
      }
    }
  }

  private appendAuctionBlockers(
    auctions: MockAuctionObligation[],
    blockers: SellerEligibilityBlocker[],
  ): void {
    for (const item of auctions) {
      const titleText = item.title || `Phiên #${item.auctionId.slice(0, 8)}`;
      if (item.type === 'LEADING_ACTIVE_AUCTION') {
        blockers.push({
          code: 'LEADING_ACTIVE_AUCTION',
          message: `Bạn đang dẫn đầu giá tại phiên đấu giá "${titleText}". Vui lòng chờ phiên kết thúc và hoàn tất nghĩa vụ mua hàng.`,
          referenceType: 'AUCTION',
          referenceId: item.auctionId,
          referenceLabel: `Xem phiên đấu giá ${titleText}`,
        });
      } else if (item.type === 'UNSETTLED_WON_AUCTION') {
        blockers.push({
          code: 'UNSETTLED_WON_AUCTION',
          message: `Bạn đã thắng phiên đấu giá "${titleText}" nhưng giao dịch thanh toán / đơn hàng chưa hoàn tất.`,
          referenceType: 'AUCTION',
          referenceId: item.auctionId,
          referenceLabel: `Hoàn tất phiên thắng đấu giá ${titleText}`,
        });
      } else {
        blockers.push({
          code: 'PARTICIPATING_ACTIVE_AUCTION',
          message: `Bạn đã đặt giá trong phiên đang mở "${titleText}". Theo quy định an toàn giao dịch MVP, tài khoản đã đặt giá cần chờ phiên kết thúc trước khi chuyển sang Seller (kể cả khi đã có người trả giá cao hơn).`,
          referenceType: 'AUCTION',
          referenceId: item.auctionId,
          referenceLabel: `Xem phiên đấu giá ${titleText}`,
        });
      }
    }
  }

  private async fetchCommerceObligations(
    userId: string,
    authHeader?: string,
  ): Promise<{
    reachable: boolean;
    hardFailure: boolean;
    blockers: SellerEligibilityBlocker[];
  }> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(
        `${this.commerceBaseUrl}/api/v1/orders?buyerId=${encodeURIComponent(userId)}&limit=100`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'x-user-id': userId,
            'x-user-role': 'BUYER',
            ...(authHeader ? { Authorization: authHeader } : {}),
          },
          signal: controller.signal,
        },
      );
      clearTimeout(timer);

      if (response.status >= 500) {
        return { reachable: true, hardFailure: true, blockers: [] };
      }

      if (!response.ok) {
        return { reachable: true, hardFailure: true, blockers: [] };
      }

      const payload = (await response.json()) as {
        data?:
          | Array<{
              id: string;
              orderNumber?: string;
              buyerId: string;
              status: MockOrderObligation['status'];
            }>
          | {
              orders?: Array<{
                id: string;
                orderNumber?: string;
                buyerId: string;
                status: MockOrderObligation['status'];
              }>;
            };
      };

      const rawOrders = Array.isArray(payload?.data) ? payload.data : payload?.data?.orders || [];
      const mapped: MockOrderObligation[] = rawOrders
        .filter((o) => o && o.buyerId === userId)
        .map((o) => ({
          orderId: o.id,
          orderNumber: o.orderNumber,
          buyerId: o.buyerId,
          status: o.status,
        }));

      const blockers: SellerEligibilityBlocker[] = [];
      this.appendOrderBlockers(mapped, blockers);
      return { reachable: true, hardFailure: false, blockers };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { reachable: false, hardFailure: true, blockers: [] };
      }
      return { reachable: false, hardFailure: false, blockers: [] };
    }
  }

  private async fetchAuctionObligations(
    userId: string,
    authHeader?: string,
  ): Promise<{
    reachable: boolean;
    hardFailure: boolean;
    blockers: SellerEligibilityBlocker[];
  }> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(
        `${this.auctionBaseUrl}/api/v1/auctions/obligations/${encodeURIComponent(userId)}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'x-user-id': userId,
            'x-user-role': 'BUYER',
            ...(authHeader ? { Authorization: authHeader } : {}),
          },
          signal: controller.signal,
        },
      );
      clearTimeout(timer);

      if (response.status >= 500) {
        return { reachable: true, hardFailure: true, blockers: [] };
      }

      if (!response.ok) {
        return { reachable: true, hardFailure: true, blockers: [] };
      }

      const payload = (await response.json()) as {
        data?: {
          obligations?: MockAuctionObligation[];
        };
      };

      const obligations = payload?.data?.obligations || [];
      const blockers: SellerEligibilityBlocker[] = [];
      this.appendAuctionBlockers(obligations, blockers);
      return { reachable: true, hardFailure: false, blockers };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { reachable: false, hardFailure: true, blockers: [] };
      }
      return { reachable: false, hardFailure: false, blockers: [] };
    }
  }
}
