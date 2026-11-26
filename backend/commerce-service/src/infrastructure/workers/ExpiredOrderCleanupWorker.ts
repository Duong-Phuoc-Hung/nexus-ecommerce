import { PrismaClientWrapper } from '../database/PrismaClient';
import { PayOsGateway } from '../clients/PayOsGateway';

export interface CleanupResult {
  expiredOrdersCount: number;
  releasedReservationsCount: number;
}

/**
 * SCRUM-173: Background Worker định kỳ quét các đơn quá hạn chưa thanh toán
 * để tự động đối soát PayOS lần cuối, hủy đơn (CANCELLED) và nhả tồn kho tạm giữ (RELEASED).
 */
export class ExpiredOrderCleanupWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;
  private readonly payOs: PayOsGateway;

  constructor(
    private readonly prisma: any = PrismaClientWrapper.getInstance(),
    private readonly orderTtlMinutes: number = 15,
    payOs?: PayOsGateway,
  ) {
    this.payOs = payOs || new PayOsGateway();
  }

  /**
   * Quét và hủy các đơn hàng chưa thanh toán quá 15 phút:
   * 1. Tìm đơn PENDING / PENDING_PAYMENT mà checkoutSessionExpiresAt <= now (hoặc quá 15 phút từ lúc tạo).
   * 2. Đổi status đơn sang CANCELLED.
   * 3. Ghi vết timeline: "Đơn hàng tự động hủy do quá hạn thanh toán 15 phút".
   * 4. Giải phóng tồn kho: đổi StockReservation từ ACTIVE sang RELEASED.
   * 5. Đổi Payment PENDING sang FAILED.
   */
  public async runCleanup(orderId?: string): Promise<CleanupResult> {
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
          ...(orderId ? { id: orderId } : {}),
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
          totalAmount: true,
        },
      });

      if (!expiredOrders || expiredOrders.length === 0) {
        return { expiredOrdersCount: 0, releasedReservationsCount: 0 };
      }

      let expiredOrdersCount = 0;
      let releasedReservationsCount = 0;

      for (const order of expiredOrders) {
        // Reconcile every attempt, including a QR cancelled locally during renewal.
        // Unknown provider state must remain retryable instead of cancelling or penalizing.
        let paid = false;
        let uncertain = false;
        const attempts = await this.prisma.payment.findMany({
          where: { orderId: order.id },
          orderBy: { id: 'desc' },
        });
        for (const attempt of attempts) {
          const status = String(attempt.status || '').toUpperCase();
          if (['SUCCEEDED', 'PAID'].includes(status)) {
            paid = true;
            break;
          }
          if (!attempt.payosOrderCode) continue;
          if (!this.payOs.isConfigured()) {
            uncertain = true;
            continue;
          }
          const remote = await this.payOs.getPaymentStatus(Number(attempt.payosOrderCode));
          if (!remote) {
            uncertain = true;
            continue;
          }
          if (remote.status.toUpperCase() === 'PAID') {
            if (remote.amountPaid < Number(order.totalAmount)) {
              uncertain = true;
              continue;
            }
            await this.prisma.$transaction(async (tx: any) => {
              await tx.payment.update({
                where: { id: attempt.id },
                data: { status: 'SUCCEEDED', paidAt: now },
              });
              await tx.order.updateMany({
                where: { id: order.id, status: { in: ['PENDING', 'PENDING_PAYMENT'] } },
                data: { status: 'PAID', updatedAt: now },
              });
              await tx.stockReservation.updateMany({
                where: { orderId: order.id, status: 'ACTIVE' },
                data: { status: 'COMMITTED' },
              });
            });
            paid = true;
            break;
          }
          if (!['CANCELLED', 'EXPIRED'].includes(remote.status.toUpperCase())) uncertain = true;
        }
        if (paid || uncertain) continue;

        const isAuctionOrder = String(order.orderCode || '')
          .toUpperCase()
          .startsWith('ORD-AUC-');
        const executeOrderCleanup = async (tx: any) => {
          const rawTimeline = Array.isArray(order.timeline) ? order.timeline : [];
          const updatedTimeline = [
            ...rawTimeline,
            {
              status: 'CANCELLED',
              title: isAuctionOrder
                ? 'Đơn trúng đấu giá tự động hủy do quá hạn thanh toán'
                : 'Đơn hàng tự động hủy do quá hạn thanh toán 15 phút',
              timestamp: now.toISOString(),
              note: isAuctionOrder
                ? 'Quá hạn thanh toán phiên đấu giá, giải phóng tồn kho tạm giữ'
                : 'Hết hạn phiên thanh toán 15 phút (SCRUM-173 Auto Cleanup)',
            },
          ];

          // 1. Cập nhật đơn hàng thành CANCELLED với điều kiện trạng thái bảo vệ chống race condition
          const updateResult = await tx.order.updateMany({
            where: {
              id: order.id,
              status: { in: ['PENDING', 'PENDING_PAYMENT'] },
            },
            data: {
              status: 'CANCELLED',
              timeline: updatedTimeline as any,
              updatedAt: now,
            },
          });

          // Chỉ khi trạng thái vẫn còn là PENDING / PENDING_PAYMENT và được hủy thành công
          if (updateResult && updateResult.count > 0) {
            expiredOrdersCount += updateResult.count;

            // 2. Nhả kho tạm thời (StockReservation ACTIVE -> RELEASED)
            const reservationUpdate = await tx.stockReservation.updateMany({
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
            await tx.payment.updateMany({
              where: {
                orderId: order.id,
                status: 'PENDING',
              },
              data: {
                status: 'FAILED',
                updatedAt: now,
              },
            });

            // 4. Hoàn trả voucher nếu đơn bị hủy do quá hạn (BUG-02)
            if (tx.promotionUsage && tx.promotion) {
              const promoUsages = await tx.promotionUsage.findMany({
                where: { orderId: order.id },
              });
              if (Array.isArray(promoUsages)) {
                for (const usage of promoUsages) {
                  await tx.promotion.update({
                    where: { id: usage.promotionId },
                    data: { usedCount: { decrement: 1 } },
                  });
                  await tx.promotionUsage.delete({
                    where: { id: usage.id },
                  });
                }
              }
            }
          }
        };

        if (typeof this.prisma.$transaction === 'function') {
          await this.prisma.$transaction(executeOrderCleanup);
        } else {
          await executeOrderCleanup(this.prisma);
        }
      }

      return {
        expiredOrdersCount,
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
