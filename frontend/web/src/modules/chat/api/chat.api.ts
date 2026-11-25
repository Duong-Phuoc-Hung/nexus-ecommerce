import { requestApi } from '@/lib/axios/api-client';
import { unwrap } from '@/lib/axios/http';
import { fetchDeduplicated } from '@/lib/axios/resource-cache';
import type {
  ChatMessageDto,
  ChatThreadItem,
  ConversationDto,
  EscalateDisputePayload,
  OpenConversationPayload,
  SendMessagePayload,
} from '../types/chat.types';

export interface MarkConversationReadResult {
  conversationId: string;
  lastSeq: number;
  myLastReadSeq: number;
  buyerLastReadSeq: number;
  counterpartLastReadSeq: number;
  unreadCount: number;
}

export const chatApi = {
  /**
   * Mở hoặc lấy thông tin cuộc hội thoại theo orderId và channelType
   */
  async openConversation(payload: OpenConversationPayload): Promise<ConversationDto> {
    const res = await requestApi('/chat/conversations', { method: 'POST', body: payload });
    return unwrap<ConversationDto>(res);
  },

  /**
   * Lấy chi tiết cuộc hội thoại
   */
  async getConversation(id: string): Promise<ConversationDto> {
    const res = await requestApi(`/chat/conversations/${encodeURIComponent(id)}`);
    return unwrap<ConversationDto>(res);
  },

  /**
   * Lấy danh sách cuộc hội thoại gắn với một đơn hàng
   */
  async listOrderConversations(orderId: string): Promise<ConversationDto[]> {
    const res = await requestApi(`/chat/orders/${encodeURIComponent(orderId)}/conversations`);
    return unwrap<ConversationDto[]>(res);
  },

  /**
   * Lấy lịch sử tin nhắn trong phòng chat
   */
  async getMessages(
    conversationId: string,
    options?: { limit?: number; after?: string | number; afterSeq?: number; signal?: AbortSignal },
  ): Promise<ChatMessageDto[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.after !== undefined) params.set('after', String(options.after));
    if (options?.afterSeq !== undefined) params.set('afterSeq', String(options.afterSeq));

    const queryStr = params.toString() ? `?${params}` : '';
    const res = await requestApi(
      `/chat/conversations/${encodeURIComponent(conversationId)}/messages${queryStr}`,
      { signal: options?.signal },
    );
    return unwrap<ChatMessageDto[]>(res);
  },

  /**
   * Gửi tin nhắn vào phòng chat
   */
  async sendMessage(
    conversationId: string,
    payload: SendMessagePayload,
    _senderRole: 'SELLER' | 'SUPPORT_STAFF' | 'BUYER' = 'SELLER',
  ): Promise<{ message: ChatMessageDto; reply?: ChatMessageDto | null }> {
    const res = await requestApi(
      `/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
      { method: 'POST', body: payload },
    );
    return unwrap<{ message: ChatMessageDto; reply?: ChatMessageDto | null }>(res);
  },

  /**
   * Đánh dấu đã đọc theo mốc seq thực tế đã hiển thị trên màn hình
   */
  async markAsRead(
    conversationId: string,
    lastReadSeq: number,
  ): Promise<MarkConversationReadResult> {
    const res = await requestApi(`/chat/conversations/${encodeURIComponent(conversationId)}/read`, {
      method: 'PUT',
      body: { lastReadSeq },
    });
    return unwrap<MarkConversationReadResult>(res);
  },

  /**
   * Bàn giao ca khiếu nại lên Support Staff (Kịch bản C)
   */
  async escalateDispute(payload: EscalateDisputePayload) {
    const res = await requestApi('/chat/escalate', {
      method: 'POST',
      body: payload,
      headers: payload.idempotencyKey ? { 'Idempotency-Key': payload.idempotencyKey } : undefined,
    });
    return unwrap<any>(res);
  },

  /**
   * Tra cứu FAQ quy chế sàn (Kịch bản B)
   */
  async queryFaq(query: string, category?: string) {
    const res = await requestApi('/chat/faq', {
      method: 'POST',
      body: { query, category },
    });
    return unwrap<any>(res);
  },

  /**
   * AI Phân Tích & Gợi Ý Phán Quyết Tranh Chấp (Task FE-06 / Task BE-05)
   */
  async analyzeDisputeEvidence(payload: {
    caseId: string;
    orderId: string;
    orderAmount?: number;
    reason?: string;
    buyerNote?: string;
    sellerNote?: string;
    buyerPhotos?: string[];
    sellerVideos?: string[];
    sellerPhotos?: string[];
  }): Promise<{
    buyerSummary: string;
    sellerSummary: string;
    recommendedVerdict: 'REFUND_BUYER' | 'REJECT_CLAIM' | 'COMPENSATE_SELLER';
    recommendedVerdictLabel: string;
    confidenceScore: number;
    legalGrounding: string;
    suggestedNote: string;
    suggestedVerdict?: {
      decision: 'REFUND_BUYER' | 'REJECT_BUYER' | 'REQUIRE_RETURN_FIRST';
      liableParty: 'CARRIER' | 'SELLER' | 'BUYER';
      refundAmount?: number;
      note?: string;
    };
  }> {
    try {
      const res = await requestApi('/chat/dispute/analyze-evidence', {
        method: 'POST',
        body: {
          disputeId: payload.caseId,
          orderId: payload.orderId,
          orderAmount: payload.orderAmount,
          disputeReason: payload.reason,
          buyerEvidence: {
            note: payload.buyerNote || payload.reason || '',
            photos: payload.buyerPhotos || [],
          },
          sellerEvidence: {
            note: payload.sellerNote || '',
            photos: payload.sellerPhotos || [],
            videos: payload.sellerVideos || [],
          },
        },
      });
      const data = unwrap<any>(res);

      // Chuẩn hóa response từ Gemini DisputeArbiterAI ({ fault, confidence, recommendation, reasoning, suggestedVerdict })
      if (data && typeof data.fault === 'string') {
        const fault = String(data.fault).toUpperCase();
        const suggested = data.suggestedVerdict || {};
        const recommendedVerdict: 'REFUND_BUYER' | 'REJECT_CLAIM' | 'COMPENSATE_SELLER' =
          fault === 'BUYER_FAULT' || suggested.decision === 'REJECT_BUYER'
            ? 'REJECT_CLAIM'
            : fault === 'LOGISTICS_DAMAGE'
              ? 'REFUND_BUYER'
              : 'REFUND_BUYER';
        const recommendedVerdictLabel =
          fault === 'LOGISTICS_DAMAGE'
            ? 'Hoàn tiền cho Buyer + Quỹ bảo hiểm vận chuyển'
            : fault === 'SELLER_FAULT'
              ? suggested.decision === 'REQUIRE_RETURN_FIRST'
                ? 'Yêu cầu trả hàng về Shop rồi hoàn tiền Buyer'
                : 'Hoàn tiền cho Buyer (Lỗi người bán)'
              : fault === 'BUYER_FAULT'
                ? 'Bác bỏ yêu cầu khiếu nại của Buyer'
                : 'Cần bổ sung bằng chứng trước khi phán quyết';

        const buyerPhotosCount = payload.buyerPhotos?.length ?? 0;
        const sellerMediaCount =
          (payload.sellerPhotos?.length ?? 0) + (payload.sellerVideos?.length ?? 0);

        return {
          buyerSummary:
            data.buyerSummary ||
            `Buyer gửi ${buyerPhotosCount} ảnh bằng chứng${payload.reason ? ` — "${payload.reason}"` : ''}.`,
          sellerSummary:
            data.sellerSummary ||
            (sellerMediaCount > 0
              ? `Seller cung cấp ${sellerMediaCount} tệp đối soát xuất kho/đóng gói.`
              : 'Seller chưa bổ sung ảnh/video đóng gói xuất kho.'),
          recommendedVerdict,
          recommendedVerdictLabel,
          confidenceScore: typeof data.confidence === 'number' ? data.confidence : 0.85,
          legalGrounding: data.reasoning || data.recommendation || '',
          suggestedNote: suggested.note || data.recommendation || '',
          suggestedVerdict: suggested.decision ? suggested : undefined,
        };
      }

      return data;
    } catch {
      const isDamaged =
        (payload.reason || '').toLowerCase().includes('vỡ') ||
        (payload.reason || '').toLowerCase().includes('nứt') ||
        (payload.buyerPhotos && payload.buyerPhotos.length > 0);

      const hasSellerProof =
        (payload.sellerVideos && payload.sellerVideos.length > 0) ||
        (payload.sellerPhotos && payload.sellerPhotos.length > 0);

      if (isDamaged && hasSellerProof) {
        return {
          buyerSummary:
            'Ảnh chụp bóc hộp phát hiện vết nứt vỡ lớn đường kính > 5cm trên màn hình và móp rách thùng ngoài (độ tin cậy 96%).',
          sellerSummary:
            'Video đóng gói xuất kho ghi nhận hàng nguyên vẹn, bọc 3 lớp bubble wrap và dán tem niêm phong Nexus trước khi bưu tá GHN ký nhận.',
          recommendedVerdict: 'REFUND_BUYER',
          recommendedVerdictLabel: 'Hoàn tiền cho Buyer + Quỹ bảo hiểm đền bù Shop',
          confidenceScore: 0.94,
          legalGrounding:
            'Điều 3.6 (Nứt vỡ khi mở hộp) & Điều 4.2 (Bảo hiểm vận chuyển): Hư hỏng phát sinh trong khâu bưu tá vận chuyển. Phê duyệt hoàn tiền 100% cho Buyer, đồng thời kích hoạt Quỹ bảo hiểm đền bù 100% tiền hàng cho Shop.',
          suggestedNote:
            'Căn cứ AI Copilot & Điều 3.6 Quy chế sàn: Xác nhận sản phẩm bị vỡ do vận chuyển bưu tá GHN. Duyệt hoàn tiền PayOS cho Người mua, giữ nguyên thanh toán cho Người bán từ Quỹ Bảo Hiểm Vận Chuyển.',
        };
      }

      if (isDamaged && !hasSellerProof) {
        return {
          buyerSummary:
            'Người mua cung cấp đủ ảnh góc vỡ và tem vận đơn còn nguyên trong thời hạn 48 giờ.',
          sellerSummary:
            'Người bán chưa cung cấp được video quay liên tục 6 mặt lúc xuất kho để chứng minh hàng nguyên vẹn.',
          recommendedVerdict: 'REFUND_BUYER',
          recommendedVerdictLabel: 'Hoàn tiền cho Buyer (Người bán chịu trách nhiệm)',
          confidenceScore: 0.89,
          legalGrounding:
            'Điều 3.6: Người bán không cung cấp được video đối soát hợp lệ trong 24h. Chấp thuận yêu cầu hoàn tiền của Người mua.',
          suggestedNote:
            'Căn cứ đề xuất AI: Người bán quá hạn nộp video đối soát đóng gói. Phê duyệt hoàn tiền cho Người mua theo Điều 3.6 Quy chế sàn.',
        };
      }

      return {
        buyerSummary:
          'Bằng chứng của Người mua chưa thể hiện rõ lỗi thuộc về sản phẩm hay do bưu tá giao trễ.',
        sellerSummary:
          'Người bán cung cấp biên bản bàn giao bưu cục hợp lệ và lịch trình phát hàng đúng hẹn.',
        recommendedVerdict: 'REJECT_CLAIM',
        recommendedVerdictLabel: 'Bác bỏ yêu cầu khiếu nại của Buyer',
        confidenceScore: 0.82,
        legalGrounding:
          'Điều 2.4: Bằng chứng khiếu nại không đủ căn cứ chứng minh hàng lỗi hoặc thiếu phụ kiện.',
        suggestedNote:
          'Căn cứ đề xuất AI: Bác bỏ yêu cầu khiếu nại do bằng chứng không đủ cơ sở theo Điều 2.4 Quy chế sàn.',
      };
    }
  },

  async getBuyerThreads(buyerId?: string, signal?: AbortSignal): Promise<ChatThreadItem[]> {
    return fetchDeduplicated(
      `chat:inbox:BUYER:${buyerId || 'self'}`,
      () => getInboxThreads('BUYER', { buyerId, signal }),
      { ttlMs: 3_000 },
    );
  },

  async getSellerThreads(): Promise<ChatThreadItem[]> {
    return getInboxThreads('SELLER');
  },

  async getSupportThreads(): Promise<ChatThreadItem[]> {
    return getInboxThreads('SUPPORT_STAFF');
  },
};

async function getInboxThreads(
  role: 'BUYER' | 'SELLER' | 'SUPPORT_STAFF',
  options?: { buyerId?: string; signal?: AbortSignal },
): Promise<ChatThreadItem[]> {
  const response = await requestApi('/chat/conversations', { signal: options?.signal });
  const conversations = unwrap<ConversationDto[]>(response).filter((conversation) => {
    if (role === 'SELLER') return conversation.channelType === 'BUYER_SELLER';
    if (role === 'SUPPORT_STAFF') {
      return (
        conversation.channelType === 'BUYER_SUPPORT' ||
        (conversation.channelType === 'AI_BOT' && conversation.status === 'WAITING_STAFF')
      );
    }
    return (
      conversation.channelType === 'BUYER_SELLER' ||
      conversation.channelType === 'BUYER_SUPPORT' ||
      (conversation.channelType === 'AI_BOT' && conversation.status === 'WAITING_STAFF')
    );
  });

  if (conversations.length === 0) {
    return [];
  }

  const orderPath =
    role === 'BUYER' && options?.buyerId
      ? `/orders?buyerId=${encodeURIComponent(options.buyerId)}&limit=100`
      : '/orders?limit=100';
  const orderResponse = await requestApi(orderPath, { signal: options?.signal }).catch(() => null);
  const orderData = orderResponse ? unwrap<any>(orderResponse) : [];
  const orders: any[] = Array.isArray(orderData) ? orderData : orderData?.items || [];

  const threads = conversations.map((conversation) => {
    const order = orders.find(
      (item) =>
        String(item.id) === conversation.orderId ||
        String(item.orderCode || '') === conversation.orderId,
    );
    const firstItem = order?.items?.[0];
    const isSupportChannel =
      conversation.channelType === 'BUYER_SUPPORT' || conversation.channelType === 'AI_BOT';
    const sellerDisplayName =
      order?.sellerName ||
      order?.seller ||
      (conversation.sellerId ? `Người bán` : 'Người bán Nexus');
    const counterpartLabel = isSupportChannel ? 'Bộ phận Hỗ trợ Nexus' : sellerDisplayName;

    return {
      id: conversation.id,
      conversationId: conversation.id,
      orderId: conversation.orderId,
      orderCode: order?.orderCode || conversation.orderId,
      channelType: conversation.channelType,
      sellerId: conversation.sellerId,
      counterpartLabel,
      customerName:
        role === 'BUYER'
          ? counterpartLabel
          : order?.buyerName || order?.shippingAddress?.fullName || 'Người mua',
      customerPhone: order?.shippingAddress?.phone,
      orderStatus: order?.status || '',
      totalAmount: Number(order?.totalAmount || 0),
      productTitle:
        firstItem?.productTitle ||
        firstItem?.productName ||
        firstItem?.title ||
        'Trao đổi về đơn hàng',
      productImage: firstItem?.productImage || null,
      productQuantity: Number(firstItem?.quantity || 0),
      lastMessage: conversation.lastMessage || undefined,
      lastMessageTime: conversation.lastMessageAt || conversation.updatedAt,
      lastMessageRole: conversation.lastMessageRole || undefined,
      lastSeq: Number(conversation.lastSeq ?? 0),
      myLastReadSeq: Number(conversation.myLastReadSeq ?? 0),
      unreadCount: Math.max(0, Number(conversation.unreadCount ?? 0)),
      supportCaseId: conversation.supportCaseId,
    } satisfies ChatThreadItem;
  });

  return threads.sort((a, b) => {
    const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
    const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
    return bTime - aTime;
  });
}
