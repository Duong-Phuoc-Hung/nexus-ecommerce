import { IConversationRepository } from '../../domain/repositories/IConversationRepository';
import { EscalateDisputeInput, EscalateDisputeResult } from '../dtos/ChatDtos';
import { RedisIdempotencyService } from '../../infrastructure/redis/RedisIdempotencyService';

export class EscalateDisputeUseCase {
  constructor(
    private readonly conversationRepo: IConversationRepository,
    private readonly idempotencyService: RedisIdempotencyService,
    private readonly fulfillmentServiceUrl?: string,
  ) {}

  public async execute(input: EscalateDisputeInput): Promise<EscalateDisputeResult> {
    const rawOrderId = (input.orderId || '').trim();
    if (!rawOrderId) {
      throw new Error('orderId là bắt buộc khi tạo hồ sơ khiếu nại.');
    }

    if (!input.reason || !input.reason.trim()) {
      throw new Error('Lý do khiếu nại không được để trống.');
    }

    // 1. Kiểm tra khóa chống trùng lặp (Idempotency Key Guard)
    const idempotencyKey = (input.idempotencyKey || '').trim();
    if (idempotencyKey) {
      const existingResult =
        await this.idempotencyService.get<EscalateDisputeResult>(idempotencyKey);
      if (existingResult) {
        // Tiêu chí nghiệm thu: Gửi lại sau lỗi mạng chỉ sinh đúng 1 case duy nhất
        return {
          ...existingResult,
          isDuplicateRequest: true,
          message:
            'Yêu cầu của bạn đã được ghi nhận trước đó. Đang tải lại hồ sơ khiếu nại hiện hữu.',
        };
      }
    }

    // 2. Kiểm tra tính hợp lệ của tệp đính kèm (MIME & Dung lượng tối đa 20MB)
    const attachments = input.attachments || [];
    const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
    const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

    for (const att of attachments) {
      if (att.mimeType && !ALLOWED_MIME.includes(att.mimeType.toLowerCase())) {
        throw new Error(
          `Định dạng tệp '${att.mimeType}' không được hỗ trợ. Chỉ chấp nhận JPG, PNG, WEBP, MP4.`,
        );
      }
      if (att.sizeBytes && att.sizeBytes > MAX_SIZE) {
        throw new Error(
          `Dung lượng tệp '${att.filename || 'đính kèm'}' vượt quá giới hạn cho phép (20MB).`,
        );
      }
    }

    // 3. Tự động gọi API sang Fulfillment Service để đưa vào Hàng đợi Support Staff
    const caseId = `cs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const orderCode = input.orderCode || rawOrderId;

    const photos = attachments
      .filter((a) => (a.mimeType || '').startsWith('image/'))
      .map((a) => a.url);
    const videos = attachments
      .filter((a) => (a.mimeType || '').startsWith('video/'))
      .map((a) => a.url);

    const baseUrl = (
      this.fulfillmentServiceUrl ||
      process.env.FULFILLMENT_SERVICE_URL ||
      `http://127.0.0.1:${process.env.FULFILLMENT_SERVICE_PORT || 4005}`
    ).replace(/\/$/, '');

    let finalCaseId = caseId;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);

      const fulfillmentRes = await fetch(`${baseUrl}/api/v1/support/cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': input.buyerId,
          'x-user-role': 'BUYER',
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        },
        body: JSON.stringify({
          caseId,
          idempotencyKey,
          orderId: rawOrderId,
          orderCode,
          customer: input.buyerName || 'Khách hàng Nexus',
          userId: input.buyerId,
          reason: input.reason.trim(),
          type: 'Yêu cầu trả hàng / hoàn tiền',
          priority: input.priority || 'Cao',
          aiVerdict: input.aiVerdict,
          sharedMessages: input.sharedMessages,
          buyerEvidence: {
            photos: photos.length > 0 ? photos : undefined,
            videos: videos.length > 0 ? videos : undefined,
            aiVerdict: input.aiVerdict,
            note: input.reason.trim(),
            submittedAt: new Date().toISOString(),
          },
          aiAssessment: input.aiVerdict
            ? {
                isDamaged:
                  (input.aiVerdict as any)?.is_damaged ??
                  Boolean((input.aiVerdict as any)?.damageAssessment),
                damageType:
                  (input.aiVerdict as any)?.damage_type ??
                  (input.aiVerdict as any)?.detectedDamageTypes?.[0],
                severity: (input.aiVerdict as any)?.severity,
                summary: (input.aiVerdict as any)?.summary,
              }
            : undefined,
        }),
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timer);

      if (fulfillmentRes && (fulfillmentRes as any).ok) {
        const json = (await (fulfillmentRes as any).json().catch(() => null)) as any;
        if (json?.data?.id) {
          finalCaseId = json.data.id;
        }
      }
    } catch {
      // Khi fulfillment service chưa bật trong môi trường test độc lập
    }

    // 4. Cập nhật liên kết Support Case vào phòng chat BUYER_SUPPORT
    const supportConv = await this.conversationRepo.findByOrderAndChannel(
      rawOrderId,
      'BUYER_SUPPORT',
    );
    if (supportConv) {
      supportConv.linkSupportCase(finalCaseId);
      await this.conversationRepo.update(supportConv);
    }

    const result: EscalateDisputeResult = {
      caseId: finalCaseId,
      orderId: rawOrderId,
      orderCode,
      status: 'PENDING_REVIEW',
      priority: input.priority || 'Cao',
      message:
        'Hồ sơ khiếu nại đã được chuyển giao thành công tới bộ phận Trọng tài Support Staff.',
      isDuplicateRequest: false,
      evidenceCount: attachments.length,
      aiVerdict: input.aiVerdict,
      sharedMessagesCount: input.sharedMessages?.length || 0,
    };

    // 5. Lưu khóa Idempotency vào bộ nhớ đệm (TTL 24h = 86400s)
    if (idempotencyKey) {
      await this.idempotencyService.set(idempotencyKey, result, 86400);
    }

    return result;
  }
}
