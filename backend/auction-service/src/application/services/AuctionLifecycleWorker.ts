import { AuctionStatus } from '../../domain/entities/Auction';
import { IAuctionRepository } from '../../domain/repositories/IAuctionRepository';
import {
  auctionRuntimeStore,
  PAYMENT_DEADLINE_MS,
} from '../../infrastructure/state/AuctionRuntimeStore';
import { emitAuctionEvent } from '../../infrastructure/websocket/socket';
import { hydrateAuctionSettlement } from '../use-cases/GetAuctionDetailUseCase';

/**
 * Worker vòng đời phiên đấu giá (G05):
 * - Chạy bù ngay khi service khởi động lại và định kỳ mỗi 15 giây.
 * - Mở phiên SCHEDULED -> ACTIVE đúng giờ server.
 * - Đóng phiên ACTIVE/EXTENDED -> ENDED đúng giờ hiệu lực, chốt kết quả đúng 1 lần
 *   (có người thắng -> WON + hạn thanh toán 24h; không có lượt -> NO_BIDS).
 */
export class AuctionLifecycleWorker {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly auctionRepository: IAuctionRepository,
    private readonly intervalMs: number = 15_000,
  ) {}

  public start(): void {
    if (this.timer) return;
    void this.tick();
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
    if (typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async tick(now: Date = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    let transitioned = 0;

    try {
      const all = await this.auctionRepository.findAll();
      for (const auction of all) {
        const prevStatus = auction.status;
        if (prevStatus === AuctionStatus.CANCELLED) continue;

        const changed = auction.syncLifecycle(now);
        if (changed) {
          await this.auctionRepository.update(auction).catch(() => {});
          auctionRuntimeStore.bumpVersion(auction.id);
          transitioned += 1;

          if (prevStatus === AuctionStatus.SCHEDULED && auction.status === AuctionStatus.ACTIVE) {
            auctionRuntimeStore.appendTimeline(auction.id, {
              type: 'STARTED',
              actorRole: 'SYSTEM',
              summary: 'Phiên đấu giá đã tự động mở theo lịch hệ thống.',
              occurredAt: now.toISOString(),
            });
            emitAuctionEvent(
              'auction:started',
              {
                auctionId: auction.id,
                status: auction.status,
                serverTime: now.toISOString(),
              },
              auction.id,
            );
          }

          if (auction.status === AuctionStatus.ENDED) {
            await this.settleEndedAuction(
              auction.id,
              auction.highestBidderId,
              auction.currentHighestBid,
              now,
              auction.endTime,
            );
          }
        } else if (
          auction.status === AuctionStatus.ENDED ||
          auction.status === AuctionStatus.SETTLED
        ) {
          const currentSettlement = auctionRuntimeStore.getSettlement(auction.id);
          if (!currentSettlement) {
            // Bù chốt kết quả hoặc nạp lại settlement bền vững từ DB sau khi restart service
            await this.settleEndedAuction(
              auction.id,
              auction.highestBidderId,
              auction.currentHighestBid,
              now,
              auction.endTime,
            );
          }

          // Quét các phiên ENDED đang PENDING thanh toán nhưng đã quá hạn paymentDueAt:
          // hydrateAuctionSettlement sẽ đối soát PayOS lần cuối qua Commerce Service, hủy đơn, nhả kho,
          // chuyển settlement sang TIMEOUT_PENALIZED, trừ 10 điểm uy tín và gửi thông báo idempotent.
          const latestSettlement = auctionRuntimeStore.getSettlement(auction.id);
          if (
            latestSettlement &&
            latestSettlement.outcome === 'WON' &&
            ['PENDING', 'RECONCILING'].includes(latestSettlement.paymentStatus || '') &&
            latestSettlement.paymentDueAt &&
            now.getTime() > new Date(latestSettlement.paymentDueAt).getTime()
          ) {
            const hydrated = await hydrateAuctionSettlement(auction, this.auctionRepository, now);
            if (hydrated?.paymentStatus === 'TIMEOUT' || hydrated?.paymentStatus === 'PAID') {
              transitioned += 1;
              emitAuctionEvent(
                'auction:updated',
                {
                  auctionId: auction.id,
                  status: auction.status,
                  paymentStatus: hydrated.paymentStatus,
                  serverTime: now.toISOString(),
                },
                auction.id,
              );
            }
          }
        }
      }
    } catch (err) {
      console.error('[AuctionLifecycleWorker] tick error:', err);
    } finally {
      this.running = false;
    }

    return transitioned;
  }

  public async settleEndedAuction(
    auctionId: string,
    winnerId: string | undefined,
    finalPrice: number,
    now: Date = new Date(),
    auctionEndTime?: Date,
  ): Promise<void> {
    if (auctionRuntimeStore.getSettlement(auctionId)) return;

    // 1. Kiểm tra bản ghi settlement bền vững trong PostgreSQL trước tiên để không bao giờ chốt lặp hay dịch hạn 24h khi restart
    if (this.auctionRepository.findSettlementByAuctionId) {
      try {
        const persisted = await this.auctionRepository.findSettlementByAuctionId(auctionId);
        if (persisted) {
          const paymentStatus =
            persisted.status === 'PAID'
              ? 'PAID'
              : persisted.status === 'TIMEOUT_PENALIZED'
                ? 'TIMEOUT'
                : 'PENDING';
          auctionRuntimeStore.setSettlement({
            auctionId,
            outcome: 'WON',
            winnerId: persisted.winnerId,
            finalPrice: persisted.winningBidAmount,
            settledAt: (
              persisted.settledAt ??
              new Date(persisted.paymentDeadline.getTime() - PAYMENT_DEADLINE_MS)
            ).toISOString(),
            paymentReadyAt: (
              persisted.settledAt ??
              new Date(persisted.paymentDeadline.getTime() - PAYMENT_DEADLINE_MS)
            ).toISOString(),
            paymentDueAt: persisted.paymentDeadline.toISOString(),
            paymentStatus,
            orderId: persisted.orderId ?? undefined,
          });
          return;
        }
      } catch (err) {
        console.error(
          `[AuctionLifecycleWorker] Không thể kiểm tra settlement DB cho phiên ${auctionId}, tạm hoãn để retry ở chu kỳ sau:`,
          err,
        );
        return;
      }
    }

    // 2. Truy vấn lịch sử đặt giá (KHÔNG nuốt lỗi thành [] để tránh chốt sai thành NO_BIDS khi DB lỗi tạm thời)
    let bids: Array<{ bidderId: string; amount: number }> = [];
    if (this.auctionRepository.findBidsByAuctionId) {
      try {
        bids = await this.auctionRepository.findBidsByAuctionId(auctionId);
      } catch (err) {
        console.error(
          `[AuctionLifecycleWorker] Lỗi đọc bids cho phiên ${auctionId}, hoãn chốt để tránh false NO_BIDS:`,
          err,
        );
        return;
      }
    }

    const hasValidBids = Boolean(winnerId) || bids.length > 0;
    const effectiveWinner = winnerId || bids[0]?.bidderId;
    const effectiveFinalPrice =
      finalPrice > 0 ? finalPrice : bids[0]?.amount ? Number(bids[0].amount) : 0;

    // Neo mốc chốt theo giờ kết thúc thực tế của phiên (không dùng now lúc restart) để bảo toàn hạn thanh toán 24h
    const anchorDate =
      auctionEndTime && auctionEndTime.getTime() <= now.getTime() ? auctionEndTime : now;
    const settledAt = anchorDate.toISOString();

    if (hasValidBids && effectiveWinner) {
      const paymentDeadline = new Date(anchorDate.getTime() + PAYMENT_DEADLINE_MS);
      const paymentDueAt = paymentDeadline.toISOString();

      // 3. Lưu bền vững settlement vào DB (bảng auction_settlements) trước khi phát sự kiện
      if (this.auctionRepository.upsertSettlement) {
        try {
          await this.auctionRepository.upsertSettlement({
            auctionId,
            winnerId: effectiveWinner,
            winningBidAmount: effectiveFinalPrice,
            paymentDeadline,
            status: 'PENDING_PAYMENT',
            settledAt: anchorDate,
          });
        } catch (err) {
          console.error(
            `[AuctionLifecycleWorker] Lỗi lưu settlement DB cho phiên ${auctionId}, sẽ retry:`,
            err,
          );
          return;
        }
      }

      auctionRuntimeStore.setSettlement({
        auctionId,
        outcome: 'WON',
        winnerId: effectiveWinner,
        finalPrice: effectiveFinalPrice,
        settledAt,
        paymentReadyAt: settledAt,
        paymentDueAt,
        paymentStatus: 'PENDING',
      });
      auctionRuntimeStore.appendTimeline(auctionId, {
        type: 'ENDED',
        actorRole: 'SYSTEM',
        summary: `Phiên kết thúc. Người thắng xác nhận với mức giá ${effectiveFinalPrice.toLocaleString('vi-VN')} ₫.`,
        occurredAt: settledAt,
        metadata: { winnerId: effectiveWinner, finalPrice: effectiveFinalPrice, paymentDueAt },
      });
      auctionRuntimeStore.appendTimeline(auctionId, {
        type: 'SETTLED',
        actorRole: 'SYSTEM',
        summary: `Đã chốt kết quả phiên. Hạn thanh toán 24 giờ tới ${paymentDueAt}.`,
        occurredAt: settledAt,
        metadata: { winnerId: effectiveWinner, finalPrice: effectiveFinalPrice, paymentDueAt },
      });
      emitAuctionEvent(
        'auction:ended',
        {
          auctionId,
          status: AuctionStatus.ENDED,
          outcome: 'WON',
          winnerId: effectiveWinner,
          finalPrice: effectiveFinalPrice,
          paymentDueAt,
          serverTime: settledAt,
        },
        auctionId,
      );
    } else {
      auctionRuntimeStore.setSettlement({
        auctionId,
        outcome: 'NO_BIDS',
        settledAt,
        paymentStatus: 'NONE',
      });
      auctionRuntimeStore.appendTimeline(auctionId, {
        type: 'ENDED',
        actorRole: 'SYSTEM',
        summary: 'Phiên kết thúc nhưng không có lượt đặt giá hợp lệ nào.',
        occurredAt: settledAt,
      });
      emitAuctionEvent(
        'auction:ended',
        {
          auctionId,
          status: AuctionStatus.ENDED,
          outcome: 'NO_BIDS',
          serverTime: settledAt,
        },
        auctionId,
      );
    }
  }
}
