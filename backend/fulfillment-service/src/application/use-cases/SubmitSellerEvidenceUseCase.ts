import { ISupportCaseRepository } from '../../domain/repositories/ISupportCaseRepository';
import { DisputeEvidence } from '../../domain/entities/SupportCase';

export interface SubmitSellerEvidenceInput {
  caseIdOrOrderId: string;
  videos?: string[];
  photos?: string[];
  note?: string;
  sellerId?: string;
  sellerRole?: string;
}

/**
 * UseCase: SubmitSellerEvidenceUseCase
 * Người bán (Seller) nộp bằng chứng đối chất (video đóng hàng, ảnh niêm phong)
 * Phục vụ cho đối soát tranh chấp trọng tài (SRS 2.3, FE-05)
 */
export class SubmitSellerEvidenceUseCase {
  constructor(private readonly supportCaseRepository: ISupportCaseRepository) {}

  public async execute(input: SubmitSellerEvidenceInput) {
    const rawId = (input.caseIdOrOrderId || '').trim();
    if (!rawId) {
      throw new Error('caseId hoặc orderId là bắt buộc.');
    }

    // 1. Tìm hồ sơ khiếu nại theo caseId trước
    let caseItem = await this.supportCaseRepository.findById(rawId);

    // 2. Nếu không tìm thấy bằng caseId, tìm kiếm theo orderId hoặc orderCode
    if (!caseItem) {
      const searchResult = await this.supportCaseRepository.search({
        query: rawId,
        limit: 10,
      });

      const matched = searchResult.items.find(
        (c) =>
          c.orderId.toLowerCase() === rawId.toLowerCase() ||
          c.orderCode.toLowerCase() === rawId.toLowerCase() ||
          c.id.toLowerCase() === rawId.toLowerCase(),
      );

      if (matched) {
        caseItem = matched;
      }
    }

    if (!caseItem) {
      throw new Error(`Không tìm thấy hồ sơ khiếu nại tương ứng với "${rawId}".`);
    }

    // 3. Chuẩn bị bằng chứng của Seller
    const evidence: DisputeEvidence = {
      videos: Array.isArray(input.videos) ? input.videos : [],
      photos: Array.isArray(input.photos) ? input.photos : [],
      note: input.note ? input.note.trim() : undefined,
      submittedAt: new Date(),
    };

    if (evidence.videos!.length === 0 && evidence.photos!.length === 0 && !evidence.note) {
      throw new Error('Vui lòng cung cấp ít nhất 1 ảnh, video hoặc ghi chú đối chất.');
    }

    // 4. Lưu bằng chứng vào thực thể và cập nhật vào repository
    caseItem.submitSellerEvidence(evidence);
    await this.supportCaseRepository.save(caseItem);

    // Gửi thông báo cho Người mua biết Người bán đã nộp bằng chứng đối chất (SRS 3.1.2)
    await this.notifyBuyerOfSellerEvidence(caseItem);

    return caseItem.toDisputeDto();
  }

  private async notifyBuyerOfSellerEvidence(caseItem: any) {
    const notificationUrl = (
      process.env.NOTIFICATION_SERVICE_URL ||
      (process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV
        ? 'http://notification-service:4006'
        : `http://localhost:${process.env.NOTIFICATION_SERVICE_PORT || 4006}`)
    ).replace(/\/$/, '');

    try {
      const title = `Người bán đã phản hồi khiếu nại đơn #${caseItem.orderCode || caseItem.orderId}`;
      const body = `Gian hàng đã nộp tài liệu đối chứng (hình ảnh/video đóng gói). Trọng tài Nexus đang tiến hành đối soát.`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);

      await fetch(`${notificationUrl}/api/v1/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: caseItem.userId,
          channel: 'DISPUTE_RESOLUTION',
          title,
          body,
          data: {
            caseId: caseItem.id,
            orderId: caseItem.orderId,
            orderCode: caseItem.orderCode,
            status: 'IN_PROGRESS',
          },
        }),
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timer);
    } catch (err: any) {
      console.warn('[SubmitSellerEvidenceUseCase] Gửi thông báo thất bại:', err?.message || err);
    }
  }
}
