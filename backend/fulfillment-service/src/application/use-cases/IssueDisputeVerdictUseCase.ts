import { ISupportCaseRepository } from '../../domain/repositories/ISupportCaseRepository';
import { buildServiceAuthHeader } from '../../infrastructure/security/internal-service-auth';
import { ArbitrationVerdict } from '../../domain/entities/SupportCase';
import {
  DisputeCommerceSyncOutbox,
  DisputeSyncOutboxRecord,
} from '../../infrastructure/outbox/DisputeCommerceSyncOutbox';

export interface IssueDisputeVerdictInput {
  caseId: string;
  decision: 'REFUND_BUYER' | 'REJECT_BUYER' | 'REQUIRE_RETURN_FIRST';
  refundAmount?: number;
  liableParty?: 'SELLER' | 'BUYER' | 'CARRIER';
  note: string;
  arbitratorId?: string;
}

export interface CommerceSyncStatus {
  status: 'SYNCED' | 'FAILED' | 'NOT_APPLICABLE';
  syncedAt: string;
  idempotencyKey: string;
  attemptCount?: number;
  nextRetryAt?: string;
  error?: string;
}

/**
 * UseCase: IssueDisputeVerdictUseCase
 * Ra phán quyết trọng tài cho tranh chấp giữa Người mua và Người bán.
 * - Lưu outbox bền vững trước khi đồng bộ sang Commerce Service với Idempotency-Key chống hoàn 2 lần (T17 / D3).
 * - Hỗ trợ retry tự động và thủ công khi Commerce Service tạm thời gián đoạn.
 * - Gửi thông báo idempotent qua Notification Service kèm orderId + caseId (D2).
 */
export class IssueDisputeVerdictUseCase {
  private readonly outbox: DisputeCommerceSyncOutbox;

  constructor(
    private readonly supportCaseRepository: ISupportCaseRepository,
    outbox?: DisputeCommerceSyncOutbox,
  ) {
    this.outbox = outbox || new DisputeCommerceSyncOutbox();
  }

  public async execute(input: IssueDisputeVerdictInput) {
    const rawId = (input.caseId || '').trim();
    if (!rawId) {
      throw new Error('caseId là bắt buộc.');
    }

    const caseItem = await this.supportCaseRepository.findById(rawId);
    if (!caseItem) {
      throw new Error(`Không tìm thấy hồ sơ khiếu nại với ID "${rawId}".`);
    }

    const verdict: ArbitrationVerdict = {
      decision: input.decision,
      refundAmount: input.refundAmount,
      liableParty: input.liableParty || 'SELLER',
      note: input.note,
      arbitratorId: input.arbitratorId,
    };

    caseItem.issueVerdict(verdict, input.arbitratorId);
    await this.supportCaseRepository.save(caseItem);

    // 1. Ghi outbox bền vững trước khi gọi Commerce Service
    const idempotencyKey = `verdict:${caseItem.id}:${input.decision}`;
    await this.outbox.enqueue({
      caseId: caseItem.id,
      orderId: caseItem.orderId,
      decision: input.decision,
      refundAmount: input.refundAmount,
      note: input.note,
      arbitratorId: input.arbitratorId || 'usr_support_arbitrator',
      idempotencyKey,
    });

    // 2. Đồng bộ trạng thái phán quyết sang commerce-service (idempotent + durable outbox)
    const commerceSync = await this.syncOutboxEntry(idempotencyKey);

    // 3. Phát thông báo cho đúng Buyer gắn orderId + caseId (phân biệt rõ nếu Commerce chưa hoàn tất)
    await this.notifyBuyer(
      caseItem.userId,
      caseItem.orderId,
      caseItem.id,
      input.decision,
      input.refundAmount,
      input.note,
      commerceSync.status === 'SYNCED',
    );

    return {
      ...caseItem.toDisputeDto(),
      commerceSync,
    };
  }

  public async retryCommerceSync(caseId: string): Promise<{
    caseId: string;
    outbox: DisputeSyncOutboxRecord | null;
    commerceSync: CommerceSyncStatus;
  }> {
    const record = await this.outbox.findLatestByCaseId(caseId);
    if (!record) {
      throw new Error(`Không tìm thấy bản ghi đồng bộ Commerce cho hồ sơ "${caseId}".`);
    }
    const commerceSync = await this.syncOutboxEntry(record.idempotencyKey);
    const updated = await this.outbox.findByIdempotencyKey(record.idempotencyKey);
    return {
      caseId,
      outbox: updated,
      commerceSync,
    };
  }

  public async getSyncStatus(caseId: string): Promise<DisputeSyncOutboxRecord | null> {
    return this.outbox.findLatestByCaseId(caseId);
  }

  public async processDueRetries(): Promise<number> {
    const due = await this.outbox.listDueRetries(20);
    let syncedCount = 0;
    for (const item of due) {
      const result = await this.syncOutboxEntry(item.idempotencyKey);
      if (result.status === 'SYNCED') syncedCount += 1;
    }
    return syncedCount;
  }

  private async syncOutboxEntry(idempotencyKey: string): Promise<CommerceSyncStatus> {
    const record = await this.outbox.findByIdempotencyKey(idempotencyKey);
    if (!record) {
      return {
        status: 'FAILED',
        syncedAt: new Date().toISOString(),
        idempotencyKey,
        error: 'Outbox record not found',
      };
    }

    // Idempotency guard: đã SYNCED trước đó thì không gọi lại Commerce lần thứ 2
    if (record.status === 'SYNCED') {
      return {
        status: 'SYNCED',
        syncedAt: record.syncedAt || record.updatedAt,
        idempotencyKey: record.idempotencyKey,
        attemptCount: record.attemptCount,
      };
    }

    const attempt = await this.notifyCommerceService(
      record.caseId,
      record.orderId,
      record.decision,
      record.refundAmount,
      record.note,
      record.arbitratorId,
      record.idempotencyKey,
    );

    if (attempt.status === 'SYNCED') {
      const updated = await this.outbox.markSynced(record.idempotencyKey);
      return {
        ...attempt,
        attemptCount: updated?.attemptCount ?? record.attemptCount + 1,
      };
    }

    const failed = await this.outbox.markFailed(
      record.idempotencyKey,
      attempt.error || 'Commerce sync failed',
    );
    return {
      ...attempt,
      attemptCount: failed?.attemptCount ?? record.attemptCount + 1,
      nextRetryAt: failed?.nextRetryAt,
    };
  }

  private async notifyCommerceService(
    caseId: string,
    orderId: string,
    decision: 'REFUND_BUYER' | 'REJECT_BUYER' | 'REQUIRE_RETURN_FIRST',
    amount?: number,
    reason?: string,
    arbitratorId?: string,
    explicitIdempotencyKey?: string,
  ): Promise<CommerceSyncStatus> {
    const idempotencyKey = explicitIdempotencyKey || `verdict:${caseId}:${decision}`;
    const syncedAt = new Date().toISOString();
    const commerceUrl = (
      process.env.COMMERCE_SERVICE_URL ||
      (process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV
        ? 'http://commerce-service:4003'
        : `http://127.0.0.1:${process.env.COMMERCE_SERVICE_PORT || 4003}`)
    ).replace(/\/$/, '');

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);

      const scopeMap: Record<'REFUND_BUYER' | 'REJECT_BUYER' | 'REQUIRE_RETURN_FIRST', string> = {
        REFUND_BUYER: 'order:refund:execute',
        REJECT_BUYER: 'order:refund:cancel',
        REQUIRE_RETURN_FIRST: 'order:status:sync',
      };
      const targetScope = scopeMap[decision];
      if (!targetScope) {
        clearTimeout(timer);
        return {
          status: 'FAILED',
          syncedAt,
          idempotencyKey,
          error: `Unsupported verdict decision: ${String(decision)}`,
        };
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
        ...buildServiceAuthHeader({
          issuer: 'fulfillment-service',
          audience: 'commerce-service',
          scope: targetScope,
          resource: orderId,
          actor: arbitratorId ? { sub: arbitratorId, role: 'SUPPORT_STAFF' } : undefined,
        }),
      };

      let response: Response | undefined;

      if (decision === 'REFUND_BUYER') {
        response = await fetch(
          `${commerceUrl}/api/v1/orders/${encodeURIComponent(orderId)}/refund/execute`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              refundAmount: amount,
              caseId,
              idempotencyKey,
              reason: `Phán quyết trọng tài chấp thuận hoàn tiền: ${reason || 'Hoàn tiền cho người mua'}`,
            }),
            signal: controller.signal,
          },
        );
      } else if (decision === 'REJECT_BUYER') {
        response = await fetch(
          `${commerceUrl}/api/v1/orders/${encodeURIComponent(orderId)}/refund/cancel`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              caseId,
              reason: `Phán quyết trọng tài từ chối khiếu nại: ${reason || 'Bác bỏ yêu cầu hoàn tiền'}`,
            }),
            signal: controller.signal,
          },
        );
      } else if (decision === 'REQUIRE_RETURN_FIRST') {
        response = await fetch(
          `${commerceUrl}/api/v1/orders/${encodeURIComponent(orderId)}/status`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              status: 'RETURN_PENDING',
              note: `Phán quyết yêu cầu người mua trả hàng hoàn tiền: ${reason || 'Chờ nhận lại kiện hàng'}`,
            }),
            signal: controller.signal,
          },
        );
      }

      clearTimeout(timer);

      // HTTP 202 = PENDING (provider chưa xác nhận hoàn tiền) -> giữ retry ở Outbox, KHÔNG đánh dấu SYNCED giả
      if (!response || !response.ok || response.status === 202) {
        const errorText = response ? await response.text().catch(() => '') : 'No response';
        const statusLabel = response ? `HTTP ${response.status}` : 'NO_RESPONSE';
        console.error(
          `[IssueDisputeVerdictUseCase] Đồng bộ phán quyết sang Commerce Service (${commerceUrl}) chưa hoàn tất [${statusLabel}]: ${errorText}`,
        );
        return {
          status: 'FAILED',
          syncedAt,
          idempotencyKey,
          error:
            response?.status === 202
              ? 'Commerce HTTP 202 (Refund PENDING reconciliation)'
              : `Commerce ${statusLabel}`,
        };
      }

      return {
        status: 'SYNCED',
        syncedAt,
        idempotencyKey,
      };
    } catch (err: any) {
      console.error(
        `[IssueDisputeVerdictUseCase] Lỗi kết nối khi đồng bộ phán quyết sang Commerce Service (${commerceUrl}):`,
        err.message,
      );
      return {
        status: 'FAILED',
        syncedAt,
        idempotencyKey,
        error: err.message || 'Commerce connection failed',
      };
    }
  }

  private async notifyBuyer(
    buyerId: string | undefined,
    orderId: string,
    caseId: string,
    decision: 'REFUND_BUYER' | 'REJECT_BUYER' | 'REQUIRE_RETURN_FIRST',
    refundAmount?: number,
    note?: string,
    commerceSynced = true,
  ): Promise<void> {
    if (!buyerId || process.env.NODE_ENV === 'test') return;
    const notifUrl = (
      process.env.NOTIFICATION_SERVICE_URL ||
      `http://127.0.0.1:${process.env.NOTIFICATION_SERVICE_PORT || 4006}`
    ).replace(/\/$/, '');
    const internalKey = process.env.INTERNAL_SERVICE_SECRET || 'nexus-internal-service-key';

    const titleMap = {
      REFUND_BUYER: `Khiếu nại #${caseId} được chấp thuận hoàn tiền`,
      REJECT_BUYER: `Đã có kết quả khiếu nại #${caseId}`,
      REQUIRE_RETURN_FIRST: `Khiếu nại #${caseId}: Cần gửi trả hàng trước khi hoàn tiền`,
    };
    const refundSuffix = commerceSynced
      ? 'Yêu cầu hoàn tiền đã được chuyển sang hệ thống thanh toán.'
      : 'Phán quyết đã lưu; hệ thống đang tự động đồng bộ hoàn tiền sang cổng thanh toán.';
    const bodyMap = {
      REFUND_BUYER:
        `Đơn #${orderId} được duyệt hoàn ${refundAmount ? `${refundAmount.toLocaleString('vi-VN')} ₫` : 'tiền'}. ${refundSuffix} ${note || ''}`.trim(),
      REJECT_BUYER: `Khiếu nại đơn #${orderId} không được chấp thuận. ${note || ''}`.trim(),
      REQUIRE_RETURN_FIRST:
        `Vui lòng gửi trả hàng cho đơn #${orderId} và cập nhật mã vận đơn trong chi tiết hồ sơ. ${note || ''}`.trim(),
    };

    try {
      await fetch(`${notifUrl}/api/v1/notifications/internal/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildServiceAuthHeader({
            issuer: 'fulfillment-service',
            audience: 'notification-service',
            scope: 'notification:dispatch',
            resource: buyerId,
          }),
          'Idempotency-Key': `verdict-notif:${caseId}:${decision}`,
        },
        body: JSON.stringify({
          idempotencyKey: `verdict-notif:${caseId}:${decision}`,
          recipientId: buyerId,
          channel: 'IN_APP',
          category: 'ORDER',
          title: titleMap[decision],
          body: bodyMap[decision],
          href: `/account/orders/${encodeURIComponent(orderId)}?caseId=${encodeURIComponent(caseId)}`,
        }),
        signal: AbortSignal.timeout(2000),
      });
    } catch {
      // Non-blocking notification
    }
  }
}
