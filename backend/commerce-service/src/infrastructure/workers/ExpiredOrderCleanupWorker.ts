import { PrismaClientWrapper } from '../database/PrismaClient';

export interface CleanupResult {
  expiredOrdersCount: number;
  releasedReservationsCount: number;
}

/**
 * SCRUM-173: Background Worker định kỳ quét các đơn quá hạn 15 phút chưa thanh toán
 * để tự động hủy đơn (CANCELLED) và nhả tồn kho tạm giữ (RELEASED).
 */
export class ExpiredOrderCleanupWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;

  constructor(
    private readonly prisma: any = PrismaClientWrapper.getInstance(),
    private readonly orderTtlMinutes: number = 15,
  ) {}

  /**
   * Quét và hủy các đơn hàng chưa thanh toán quá 15 phút:
   * 1. Tìm đơn PENDING / PENDING_PAYMENT mà checkoutSessionExpiresAt <= now (hoặc quá 15 phút từ lúc tạo).
   * 2. Đổi status đơn sang CANCELLED.
   * 3. Ghi vết timeline: "Đơn hàng tự động hủy do quá hạn thanh toán 15 phút".
   * 4. Giải phóng tồn kho: đổi StockReservation từ ACTIVE sang RELEASED.
   * 5. Đổi Payment PENDING sang FAILED.
   */
  public async runCleanup(): Promise<CleanupResult> {
    if (this.isRunning) {
      return { expiredOrdersCount: 0, releasedReservationsCount: 0 };
    }

    this.isRunning = true;
    try {
      const now = new Date();
      const cutoffTime = new Date(now.getTime() - this.orderTtlMinutes * 60 * 1000);

      // Tìm các đơn hàng quá hạn thanh toán
      const expiredOrders = await this.prisma.order.findMany({
        where: {
          status: { in: ['PENDING', 'PENDING_PAYMENT'] },
          OR: [
            { checkoutSessionExpiresAt: { lte: now } },
            {
              checkoutSessionExpiresAt: null,
              createdAt: { lte: cutoffTime },
            },
          ],
        },
        select: {
          id: true,
          orderCode: true,
          timeline: true,
        },
      });

      if (!expiredOrders || expiredOrders.length === 0) {
        return { expiredOrdersCount: 0, releasedReservationsCount: 0 };
      }

      let releasedReservationsCount = 0;

      for (const order of expiredOrders) {
        const rawTimeline = Array.isArray(order.timeline) ? order.timeline : [];
        const updatedTimeline = [
          ...rawTimeline,
          {
            status: 'CANCELLED',
            title: 'Đơn hàng tự động hủy do quá hạn thanh toán 15 phút',
            timestamp: now.toISOString(),
            note: 'Hết hạn phiên thanh toán 15 phút (SCRUM-173 Auto Cleanup)',
          },
        ];

        // 1. Cập nhật đơn hàng thành CANCELLED
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'CANCELLED',
            timeline: updatedTimeline as any,
            updatedAt: now,
          },
        });

        // 2. Nhả kho tạm thời (StockReservation ACTIVE -> RELEASED)
        const reservationUpdate = await this.prisma.stockReservation.updateMany({
          where: {
            orderId: order.id,
            status: 'ACTIVE',
          },
          data: {
            status: 'RELEASED',
          },
        });
        releasedReservationsCount += reservationUpdate?.count || 0;

        // 3. Đánh dấu giao dịch thanh toán quá hạn nếu có
        await this.prisma.payment.updateMany({
          where: {
            orderId: order.id,
            status: 'PENDING',
          },
          data: {
            status: 'FAILED',
            updatedAt: now,
          },
        });
      }

      return {
        expiredOrdersCount: expiredOrders.length,
        releasedReservationsCount,
      };
    } catch (error) {
      console.warn('[ExpiredOrderCleanupWorker] Error during cleanup:', (error as Error)?.message);
      return { expiredOrdersCount: 0, releasedReservationsCount: 0 };
    } finally {
      this.isRunning = false;
    }
  }

  public start(intervalMs: number = 60000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.runCleanup().catch((err) => {
        console.warn('[ExpiredOrderCleanupWorker] Periodic execution error:', err?.message);
      });
    }, intervalMs);

    // unref để không chặn NodeJS process thoát khi shutdown/test
    if (this.timer && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
