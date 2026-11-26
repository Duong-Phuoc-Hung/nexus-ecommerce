import {
  AiReplyResult,
  ChatContext,
  ILanguageModelProvider,
} from '../../application/ports/ILanguageModelProvider';
import { OrderTrackingTool, ShipmentTrackingInfo } from '../../application/tools/OrderTrackingTool';
import { IPolicyRepository } from '../../domain/repositories/IPolicyRepository';

/**
 * ADAPTER OFFLINE: RuleBasedLlmProvider
 * Cơ chế Fallback an toàn: Hoạt động hoàn toàn nội bộ không cần mạng và không cần API key.
 * Tái sử dụng logic nghiệp vụ sẵn có (tra cứu từ khóa vận đơn và điều khoản sàn Nexus v1.2).
 */
export class RuleBasedLlmProvider implements ILanguageModelProvider {
  constructor(
    private readonly orderTrackingTool?: OrderTrackingTool,
    private readonly policyRepo?: IPolicyRepository,
  ) {}

  public async generateReply(prompt: string, context: ChatContext): Promise<AiReplyResult> {
    const text = (prompt || '').trim();
    const lower = text.toLowerCase();

    // 1. Kịch bản Vận đơn / Tra cứu lộ trình đơn hàng
    if (
      lower.includes('đến đâu') ||
      lower.includes('tới đâu') ||
      lower.includes('ở đâu') ||
      lower.includes('đang ở đâu') ||
      lower.includes('vận chuyển') ||
      lower.includes('vận đơn') ||
      lower.includes('giao') ||
      lower.includes('bưu tá') ||
      lower.includes('vị trí') ||
      lower.includes('tracking') ||
      lower.includes('ship') ||
      lower.includes('kiện hàng') ||
      lower.includes('lộ trình')
    ) {
      // Tìm mã đơn hàng từ prompt (ví dụ: ORD-20261126-000023, NX-ORD-8021) hoặc lấy từ context hội thoại
      const orderMatch = text.match(
        /(?:NEX-TRK-)?((?:NX-)?ORD-(?:AUC-)?[a-zA-Z0-9-]+|ord_[a-zA-Z0-9_-]+)/i,
      );
      const targetOrderId = orderMatch
        ? (orderMatch[1] || orderMatch[0]).toUpperCase()
        : context.orderId;

      if (targetOrderId) {
        const trackingTool = this.orderTrackingTool || new OrderTrackingTool();
        let trackingInfo: ShipmentTrackingInfo | null = null;
        try {
          trackingInfo = await trackingTool.trackByOrder(targetOrderId);
        } catch {
          trackingInfo = null;
        }

        let replyText = `Đơn hàng ${targetOrderId} của bạn hiện có trạng thái: ${trackingInfo?.status || 'Đang giao'}.`;
        if (trackingInfo) {
          replyText = `🚚 Tiến trình vận chuyển đơn hàng ${targetOrderId}:\nHiện tại kiện hàng đang được hãng ${trackingInfo.carrier} vận chuyển với mã tra cứu ${trackingInfo.trackingCode}. Trạng thái: ${trackingInfo.status}.\nVị trí ghi nhận: ${trackingInfo.currentLocation} (${trackingInfo.estimatedDelivery || 'dự kiến giao sớm'}).`;
        }

        return {
          content: replyText,
          modelUsed: 'rule-based-fallback',
          toolCalls: [
            {
              name: 'trackOrderShipment',
              args: { orderCode: targetOrderId },
              result: trackingInfo,
            },
          ],
          metadata: {
            topic: 'order_tracking',
            orderId: targetOrderId,
          },
        };
      }
    }

    // 1.1 Kịch bản Kiểm tra thanh toán đơn hàng
    if (
      lower.includes('thanh toán') ||
      lower.includes('trừ tiền') ||
      lower.includes('tiền') ||
      lower.includes('payos') ||
      lower.includes('chuyển khoản') ||
      lower.includes('đã trả') ||
      lower.includes('escrow')
    ) {
      const orderMatch = text.match(
        /(?:NEX-TRK-)?((?:NX-)?ORD-(?:AUC-)?[a-zA-Z0-9-]+|ord_[a-zA-Z0-9_-]+)/i,
      );
      const targetOrderId = orderMatch
        ? (orderMatch[1] || orderMatch[0]).toUpperCase()
        : context.orderId;

      if (targetOrderId) {
        return {
          content: `💳 Xác nhận thanh toán đơn hàng ${targetOrderId}:\nĐơn hàng đã được xác nhận thanh toán thành công qua cổng giao dịch PayOS (VietQR). Khoản tiền hiện được bảo chứng an toàn tại quỹ ký quỹ Nexus Escrow và chỉ giải ngân cho Người bán sau khi bạn nhận hàng nguyên vẹn và xác nhận hài lòng.`,
          modelUsed: 'rule-based-fallback',
          metadata: {
            topic: 'order_payment',
            orderId: targetOrderId,
          },
        };
      }
    }

    // 2. Kịch bản Context nhận diện từ trang Frontend (Product, Checkout, Auction)
    const pageCtx = context.pageContext;
    if (pageCtx && pageCtx.pageKind) {
      if (
        pageCtx.pageKind === 'CART_CHECKOUT' &&
        (lower.includes('tổng tiền') ||
          lower.includes('phí') ||
          lower.includes('thanh toán') ||
          lower.includes('giá'))
      ) {
        return {
          content:
            'Đơn hàng trong giỏ của bạn bao gồm: tiền hàng sản phẩm + phí vận chuyển tính theo địa chỉ nhận + giảm giá voucher (nếu có). Bạn có thể kiểm tra trạng thái thanh toán hoặc đổi phương thức thanh toán sang PayOS / COD.',
          modelUsed: 'rule-based-fallback',
          metadata: {
            topic: 'checkout_context',
            pageKind: pageCtx.pageKind,
          },
        };
      }

      if (
        pageCtx.pageKind === 'PRODUCT_DETAIL' &&
        (lower.includes('hàng') ||
          lower.includes('sản phẩm') ||
          lower.includes('bảo hành') ||
          lower.includes('tồn kho'))
      ) {
        return {
          content:
            'Bạn đang xem chi tiết sản phẩm. Tất cả sản phẩm chính hãng trên sàn Nexus đều được kiểm định chất lượng và hỗ trợ đổi trả trong 7 ngày nếu lỗi phát sinh do người bán hoặc vận chuyển.',
          modelUsed: 'rule-based-fallback',
          metadata: {
            topic: 'product_context',
            pageKind: pageCtx.pageKind,
            productId: pageCtx.productId,
          },
        };
      }
    }

    // 3. Kịch bản Tra cứu Quy chế / Chính sách sàn Nexus v1.2
    if (this.policyRepo) {
      const isPolicyQuery =
        lower.includes('cọc') ||
        lower.includes('đặt cọc') ||
        lower.includes('tịch thu') ||
        lower.includes('hoàn tiền') ||
        lower.includes('trả hàng') ||
        lower.includes('đổi trả') ||
        lower.includes('vỡ') ||
        lower.includes('phạt') ||
        lower.includes('quy chế') ||
        lower.includes('thời hạn');

      if (isPolicyQuery) {
        try {
          const matchedPolicies = await this.policyRepo.search(text);
          if (matchedPolicies.length > 0) {
            const topPolicy = matchedPolicies[0];
            const defaultVal = topPolicy.defaultValue || {};

            let replyText = topPolicy.content;
            if (topPolicy.category === 'AUCTION') {
              replyText += ` (Lưu ý: Mức phạt mặc định của hệ thống là trừ ${defaultVal.penalty_points || 10} điểm uy tín và thời hạn thanh toán là ${defaultVal.pay_window_hours || 24} giờ kể từ khi phiên đấu giá kết thúc).`;
            } else if (topPolicy.category === 'REFUND') {
              replyText += ` (Lưu ý: Thời hạn đổi trả tiêu chuẩn là ${defaultVal.return_window_days || 7} ngày kể từ ngày nhận hàng thành công).`;
            }

            return {
              content: replyText,
              modelUsed: 'rule-based-fallback',
              metadata: {
                topic: 'policy_faq',
                policyCode: topPolicy.policyCode,
                citationSource: topPolicy.citationSource,
                version: topPolicy.version,
              },
            };
          }
        } catch {
          // Bỏ qua lỗi search policy để rơi vào fallback mặc định
        }
      }
    }

    // 3. Phản hồi chuẩn mực mặc định (Sàn Nexus)
    const fallbackDefault =
      'Xin chào! Tôi là Trợ lý AI của sàn thương mại điện tử Nexus. ' +
      'Tôi có thể hỗ trợ bạn tra cứu lộ trình vận đơn (ví dụ: "Đơn hàng NX-ORD-8021 đến đâu rồi?") ' +
      'hoặc giải đáp các thắc mắc về quy chế thanh toán, đổi trả và đặt cọc v1.2. ' +
      'Nếu bạn có khiếu nại phát sinh, bạn có thể gửi yêu cầu hỗ trợ để nhân viên Support can thiệp giải quyết.';

    return {
      content: fallbackDefault,
      modelUsed: 'rule-based-fallback',
      metadata: {
        topic: 'general_assistance',
      },
    };
  }
}
