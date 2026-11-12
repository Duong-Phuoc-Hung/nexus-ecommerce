import { requestApi } from '@/lib/axios/api-client';
import { ApiError, unwrap, type RequestApi } from '@/lib/axios/http';
import type { OrderDetail } from '../types/order.types';
import type {
  AssistOrderConversationInput,
  ConversationAttachment,
  ConversationChannel,
  CreateConversationCaseInput,
  HandoffOrderConversationInput,
  OpenOrderConversationInput,
  OrderConversation,
  OrderConversationCaseSummary,
  OrderMessage,
  SendOrderMessageInput,
} from '../types/order-conversation.types';

const STORAGE_KEY = 'nexus-buyer-order-conversations-v1';

interface StoredThreadBundle {
  conversation: OrderConversation;
  messages: OrderMessage[];
  idempotentCases: Record<string, OrderConversationCaseSummary>;
  attachments: Record<string, ConversationAttachment>;
}

function readLocalStore(): Record<string, StoredThreadBundle> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalStore(store: Record<string, StoredThreadBundle>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Bỏ qua lỗi quota trình duyệt
  }
}

function makeThreadKey(
  orderId: string,
  buyerId: string,
  channel: ConversationChannel,
  recipientKey: string,
) {
  return `${orderId}::${buyerId}::${channel}::${recipientKey}`;
}

export function generateClientUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function shouldFallbackToSimulation(err: unknown): boolean {
  if (err instanceof ApiError) {
    return (
      err.status === 404 ||
      err.status === 501 ||
      err.status === 502 ||
      err.status === 503 ||
      err.status === 0
    );
  }
  return true;
}

export interface ReadOnlyOrderShipmentSnapshot {
  hasShipment: boolean;
  carrier?: string;
  trackingCode?: string;
  status?: string;
  statusLabel?: string;
  currentLocation?: string;
  updatedAt?: string;
  estimatedDeliveryAt?: string | null;
}

/**
 * Đọc trạng thái vận đơn ở chế độ chỉ đọc (Read-Only) cho khung chat và AI.
 * Tuyệt đối không tự sinh dữ liệu vận chuyển sandbox nếu đơn chưa có vận đơn.
 */
export async function fetchReadOnlyOrderShipment(
  order: OrderDetail,
  signal?: AbortSignal,
): Promise<ReadOnlyOrderShipmentSnapshot> {
  const orderStatus = (order.status || '').toUpperCase();
  const rawTracking =
    order.tracking && order.tracking !== '—' && !order.tracking.startsWith('NEX-TRK-')
      ? order.tracking
      : '';

  // Nếu đơn đang chờ thanh toán hoặc đã hủy trước khi giao và chưa có mã vận đơn thực
  if (['PENDING', 'PENDING_PAYMENT', 'CREATED', 'PLACED'].includes(orderStatus) && !rawTracking) {
    return {
      hasShipment: false,
    };
  }

  try {
    const raw = await requestApi<{
      success?: boolean;
      data?: {
        carrier?: string;
        trackingCode?: string;
        status?: string;
        statusCode?: string;
        currentLocation?: string;
        updatedAt?: string;
        updated?: string;
        estimatedDeliveryAt?: string | null;
      };
    }>(`/fulfillments/shipments/by-order/${encodeURIComponent(order.id)}?readOnly=true`, {
      signal,
    });
    const data = unwrap<{
      carrier?: string;
      trackingCode?: string;
      status?: string;
      statusCode?: string;
      currentLocation?: string;
      updatedAt?: string;
      updated?: string;
      estimatedDeliveryAt?: string | null;
    }>(raw);

    if (data && (data.trackingCode || data.status)) {
      return {
        hasShipment: true,
        carrier: data.carrier || 'GHN',
        trackingCode: data.trackingCode || rawTracking || undefined,
        status: data.statusCode || data.status,
        statusLabel: formatShipmentStatusVi(data.statusCode || data.status || ''),
        currentLocation: data.currentLocation || undefined,
        updatedAt: data.updatedAt || data.updated || order.createdAt,
        estimatedDeliveryAt: data.estimatedDeliveryAt ?? null,
      };
    }
  } catch {
    // Fallback sang dữ liệu snapshot có sẵn trên đơn hàng mà không ghi dữ liệu mới
  }

  if (orderStatus === 'SHIPPED' || orderStatus === 'DELIVERED' || Boolean(rawTracking)) {
    const latestEvent =
      order.timeline && order.timeline.length > 0
        ? order.timeline[order.timeline.length - 1]
        : null;
    return {
      hasShipment: true,
      carrier: 'GHN · Nexus Express',
      trackingCode: rawTracking || undefined,
      status: orderStatus,
      statusLabel:
        orderStatus === 'DELIVERED'
          ? 'Đã giao hàng thành công'
          : orderStatus === 'SHIPPED'
            ? 'GHN đang giao đơn'
            : 'Đã tạo thông tin vận đơn',
      updatedAt: latestEvent?.timestamp || order.createdAt,
      estimatedDeliveryAt: null,
    };
  }

  return {
    hasShipment: false,
  };
}

function formatShipmentStatusVi(status: string): string {
  const normalized = status.toUpperCase();
  switch (normalized) {
    case 'READY_TO_PICK':
    case 'CREATED':
      return 'Chờ bưu tá GHN lấy hàng';
    case 'PICKED':
      return 'Bưu tá đã lấy kiện hàng';
    case 'IN_TRANSIT':
    case 'SHIPPED':
    case 'DELIVERING':
      return 'GHN đang giao đơn';
    case 'DELIVERED':
      return 'Đã giao hàng thành công';
    case 'DELIVERY_FAILED':
      return 'Giao hàng chưa thành công (Chờ phát lại)';
    case 'RETURNED':
    case 'RTO':
      return 'Kiện hàng đang hoàn về kho Người bán';
    default:
      return status || 'Đang cập nhật hành trình';
  }
}

function buildAiAssistReply(
  order: OrderDetail,
  shipment: ReadOnlyOrderShipmentSnapshot,
  input: AssistOrderConversationInput,
): {
  body: string;
  aiMetadata: OrderMessage['aiMetadata'];
} {
  const q = input.question.trim().toLowerCase();

  if (input.intent === 'TRACK_SHIPMENT') {
    if (!shipment.hasShipment) {
      return {
        body:
          `[Tra cứu vận đơn #${order.id}] Đơn chưa có vận đơn. ` +
          `Hiện trạng thái đơn là "${order.status || 'Đang chuẩn bị'}". ` +
          `Khi Người bán đóng gói xong và bàn giao cho đơn vị vận chuyển, mã vận đơn và lộ trình sẽ hiển thị tại đây.`,
        aiMetadata: {
          intent: 'TRACK_SHIPMENT',
          shipmentStatus: 'NO_SHIPMENT',
          suggestHumanHandoff: false,
        },
      };
    }

    const updatedTimeStr = shipment.updatedAt
      ? new Date(shipment.updatedAt).toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : 'vừa xong';

    const parts = [
      `${shipment.statusLabel || 'GHN đang giao đơn'}.`,
      `Đơn vị vận chuyển: ${shipment.carrier || 'GHN'}${
        shipment.trackingCode ? ` (Mã vận đơn: ${shipment.trackingCode})` : ''
      }.`,
      shipment.currentLocation ? `Vị trí ghi nhận: ${shipment.currentLocation}.` : '',
      `Cập nhật lúc ${updatedTimeStr}.`,
      shipment.estimatedDeliveryAt
        ? `Giờ giao dự kiến (ETA): ${new Date(shipment.estimatedDeliveryAt).toLocaleString('vi-VN')}.`
        : '',
    ].filter(Boolean);

    return {
      body: parts.join(' '),
      aiMetadata: {
        intent: 'TRACK_SHIPMENT',
        carrier: shipment.carrier || 'GHN',
        trackingCode: shipment.trackingCode,
        shipmentStatus: shipment.statusLabel || shipment.status,
        updatedAt: shipment.updatedAt,
        estimatedDeliveryAt: shipment.estimatedDeliveryAt ?? null,
        suggestHumanHandoff: false,
      },
    };
  }

  if (input.intent === 'DRAFT_COMPLAINT') {
    const itemSummary =
      order.items && order.items.length > 0
        ? order.items.map((it) => `${it.productName || it.productId} (x${it.quantity})`).join(', ')
        : `Đơn hàng #${order.id}`;
    const draftDesc =
      `Báo cáo sự cố đối với đơn hàng #${order.id} (${itemSummary}): ` +
      `${input.question.trim() || 'Sản phẩm nhận được có dấu hiệu hư hỏng / không đúng mô tả, đề nghị kiểm tra đối chứng.'}`;
    return {
      body:
        `Trợ lý Nexus đã chuẩn bị sẵn bản nháp khiếu nại cho đơn #${order.id}. ` +
        `Bạn có thể bấm nút "Mở form Gửi khiếu nại từ bản nháp" bên dưới để chọn dòng hàng, đính kèm ảnh minh chứng và xem lại trước khi xác nhận gửi.`,
      aiMetadata: {
        intent: 'DRAFT_COMPLAINT',
        draftComplaint: {
          type: 'DAMAGED_ITEM',
          description: draftDesc,
        },
      },
    };
  }

  // POLICY_FAQ: Phân tích câu hỏi (bao gồm cả câu hỏi ghép về quá hạn đấu giá + mất cọc / đổi trả)
  const asksAuctionDeadline =
    q.includes('đấu giá') ||
    q.includes('quá hạn') ||
    q.includes('thanh toán') ||
    q.includes('phạt');
  const asksDeposit = q.includes('cọc') || q.includes('mất cọc') || q.includes('tiền cọc');
  const asksReturnOrSla =
    q.includes('đổi trả') ||
    q.includes('trả hàng') ||
    q.includes('hoàn tiền') ||
    q.includes('vỡ') ||
    q.includes('hỏng') ||
    q.includes('sla') ||
    q.includes('mấy ngày');

  const sections: string[] = [];
  const sources: string[] = [];

  if (asksAuctionDeadline || (!asksDeposit && !asksReturnOrSla)) {
    sections.push(
      `• Thời hạn thanh toán đấu giá (Payment Deadline Enforcement): Theo cấu hình mặc định của hệ thống Nexus (AUCTION_PAYMENT_DEADLINE_HOURS = 24 giờ, PAYMENT_TIMEOUT_PENALTY_SCORE = 10 điểm), người thắng đấu giá cần hoàn tất thanh toán trong thời hạn áp dụng cho phiên đó; nếu quá hạn, đơn chuyển trạng thái违/hủy quá hạn và áp dụng trừ điểm uy tín theo chính sách của phiên.`,
    );
    sources.push(
      'SRS v1.0 §Payment Deadline Enforcement (AUCTION_PAYMENT_DEADLINE_HOURS, PAYMENT_TIMEOUT_PENALTY_SCORE)',
    );
  }

  if (asksDeposit) {
    sections.push(
      `• Về tiền đặt cọc (mất cọc): Tài liệu SRS Nexus v1.0 hiện chỉ quy định cơ chế khóa hạn mức/trừ điểm uy tín (Reputation Score) khi quá hạn thanh toán đấu giá, CHƯA có quy định khẳng định việc thu giữ hay mất tiền cọc.`,
    );
    sources.push('SRS v1.0 §Reputation & Bidding Rules (Đối chiếu phạm vi chính sách)');
  }

  if (asksReturnOrSla || sections.length === 0) {
    sections.push(
      `• Về hủy đơn, trả hàng & khiếu nại: Buyer có quyền hủy đơn khi đơn chưa bàn giao vận chuyển (nếu đã trả tiền sẽ khởi tạo luồng hoàn tiền ORDER.REFUND). Khi nhận hàng bị vỡ/hỏng hoặc sai mô tả, Buyer có thể gửi Khiếu nại kèm bằng chứng để Support đối chứng với Seller. Lưu ý: SRS v1.0 chưa quy định cứng số ngày đổi trả vật lý tối đa hay cam kết SLA xử lý trong 3 giờ — vui lòng bấm "Gặp nhân viên" để nhân viên Support kiểm tra trực tiếp cho đơn #${order.id}.`,
    );
    sources.push('SRS v1.0 §2.3 System Actors, §Order Cancellation & Refund');
  }

  return {
    body: sections.join('\n\n'),
    aiMetadata: {
      intent: 'POLICY_FAQ',
      policySources: sources,
      suggestHumanHandoff: true,
    },
  };
}

export function createOrderConversationsApi(request: RequestApi) {
  return {
    /**
     * 1. POST /api/v1/orders/:orderId/conversations
     * Mở hoặc lấy cuộc trò chuyện hiện có của Buyer theo kênh SELLER hoặc SUPPORT
     */
    async openOrGetConversation(
      order: OrderDetail,
      buyerId: string,
      input: OpenOrderConversationInput,
    ): Promise<{ conversation: OrderConversation; messages: OrderMessage[] }> {
      const recipientKey =
        input.channel === 'SELLER'
          ? String(input.sellerId || order.sellerId || 'default-seller')
          : 'SUPPORT';
      const recipientLabel =
        input.channel === 'SELLER'
          ? input.sellerName || order.seller || `Gian hàng #${recipientKey}`
          : 'Bộ phận Hỗ trợ Nexus (Support)';

      try {
        const raw = await request<{
          success: boolean;
          data: { conversation: OrderConversation; messages?: OrderMessage[] };
        }>(`/orders/${encodeURIComponent(input.orderId)}/conversations`, {
          method: 'POST',
          body: {
            channel: input.channel,
            sellerId: input.channel === 'SELLER' ? recipientKey : undefined,
            requestHuman: Boolean(input.requestHuman),
          },
        });
        const unwrapped = unwrap<{ conversation: OrderConversation; messages?: OrderMessage[] }>(
          raw,
        );
        return {
          conversation: {
            ...unwrapped.conversation,
            recipientLabel: unwrapped.conversation.recipientLabel || recipientLabel,
            sourceMode: 'LIVE_API',
          },
          messages: Array.isArray(unwrapped.messages) ? unwrapped.messages : [],
        };
      } catch (err) {
        if (!shouldFallbackToSimulation(err)) throw err;

        const store = readLocalStore();
        const key = makeThreadKey(input.orderId, buyerId, input.channel, recipientKey);
        const existing = store[key];
        if (existing) {
          if (
            input.requestHuman &&
            existing.conversation.channel === 'SUPPORT' &&
            existing.conversation.state === 'OPEN'
          ) {
            existing.conversation.state = 'WAITING';
            existing.conversation.updatedAt = new Date().toISOString();
            writeLocalStore(store);
          }
          return {
            conversation: existing.conversation,
            messages: existing.messages,
          };
        }

        const now = new Date().toISOString();
        const welcomeSeq = 1;
        const convId = generateClientUuid();
        const initialMessage: OrderMessage = {
          conversationId: convId,
          seq: welcomeSeq,
          authorId: 'nexus-ai-assistant',
          authorName: 'Trợ lý Nexus',
          authorRole: 'AI',
          clientMessageId: generateClientUuid(),
          body:
            input.channel === 'SELLER'
              ? `Xin chào! Đây là luồng trao đổi trực tiếp với ${recipientLabel} cho đơn hàng #${order.id}. Bạn có thể nhắn trực tiếp cho người bán hoặc bấm "Hỏi AI về vận đơn" để tra cứu nhanh lộ trình.`
              : `Xin chào! Đây là kênh Hỗ trợ đơn hàng #${order.id}. Bạn có thể hỏi Trợ lý Nexus về vận đơn/chính sách, bấm "Gặp nhân viên" để chuyển vào hàng đợi nhân viên hỗ trợ, hoặc gửi hồ sơ Khiếu nại / Báo hàng vỡ.`,
          createdAt: now,
          deliveryStatus: 'sent',
        };

        const conversation: OrderConversation = {
          id: convId,
          orderId: String(order.id),
          buyerId,
          channel: input.channel,
          recipientKey,
          recipientLabel,
          assigneeId: null,
          assigneeName: null,
          state: input.channel === 'SUPPORT' && input.requestHuman ? 'WAITING' : 'OPEN',
          lastSeq: welcomeSeq,
          buyerLastReadSeq: welcomeSeq,
          counterpartLastReadSeq: welcomeSeq,
          linkedCases: [],
          updatedAt: now,
          sourceMode: 'LOCAL_SIMULATION',
        };

        store[key] = {
          conversation,
          messages: [initialMessage],
          idempotentCases: {},
          attachments: {},
        };
        writeLocalStore(store);

        return {
          conversation,
          messages: [initialMessage],
        };
      }
    },

    /**
     * 2. GET /api/v1/conversations/:id/messages?after=cursor&before=cursor
     * Lấy lịch sử tin nhắn công khai theo thứ tự seq của server
     */
    async listMessages(
      conversationId: string,
      options?: { after?: number; before?: number; limit?: number; signal?: AbortSignal },
    ): Promise<{
      items: OrderMessage[];
      conversation: OrderConversation | null;
      hasOlder: boolean;
    }> {
      const params = new URLSearchParams();
      if (options?.after !== undefined) params.set('after', String(options.after));
      if (options?.before !== undefined) params.set('before', String(options.before));
      if (options?.limit !== undefined) params.set('limit', String(options.limit));
      const qs = params.toString();

      try {
        const raw = await request<{
          success: boolean;
          data: {
            items: OrderMessage[];
            conversation?: OrderConversation;
            hasOlder?: boolean;
          };
        }>(`/conversations/${encodeURIComponent(conversationId)}/messages${qs ? `?${qs}` : ''}`, {
          signal: options?.signal,
        });
        const data = unwrap<{
          items: OrderMessage[];
          conversation?: OrderConversation;
          hasOlder?: boolean;
        }>(raw);
        return {
          items: Array.isArray(data.items) ? data.items : [],
          conversation: data.conversation ? { ...data.conversation, sourceMode: 'LIVE_API' } : null,
          hasOlder: Boolean(data.hasOlder),
        };
      } catch (err) {
        if (!shouldFallbackToSimulation(err)) throw err;

        const store = readLocalStore();
        const bundle = Object.values(store).find((b) => b.conversation.id === conversationId);
        if (!bundle) {
          throw new ApiError('Không tìm thấy hội thoại.', 404, 'CONVERSATION_NOT_FOUND');
        }

        let list = [...bundle.messages].sort((a, b) => a.seq - b.seq);
        if (options?.after !== undefined) {
          list = list.filter((m) => m.seq > options.after!);
        }
        if (options?.before !== undefined) {
          list = list.filter((m) => m.seq < options.before!);
        }
        const limit = options?.limit ?? 30;
        const hasOlder = options?.after === undefined && list.length > limit;
        const sliced = options?.after === undefined ? list.slice(-limit) : list.slice(0, limit);

        return {
          items: sliced,
          conversation: bundle.conversation,
          hasOlder,
        };
      }
    },

    /**
     * 3. POST /api/v1/conversations/:id/messages
     * Gửi tin nhắn văn bản (kèm clientMessageId chống gửi trùng)
     */
    async sendMessage(
      buyerId: string,
      buyerName: string,
      input: SendOrderMessageInput,
      options?: { simulateNetworkFailure?: boolean },
    ): Promise<{ message: OrderMessage; conversation: OrderConversation }> {
      const body = input.text.trim();
      const charCount = [...body].length;
      if (!body || charCount > 4000) {
        throw new ApiError(
          'Nội dung tin nhắn không hợp lệ (từ 1 đến 4000 ký tự, không chỉ gồm khoảng trắng).',
          422,
          'INVALID_MESSAGE_BODY',
        );
      }

      if (options?.simulateNetworkFailure) {
        throw new ApiError(
          'Kết nối mạng bị gián đoạn khi gửi tin. Nội dung của bạn đã được giữ lại, vui lòng bấm "Gửi lại".',
          503,
          'NETWORK_SEND_FAILED',
        );
      }

      try {
        const raw = await request<{
          success: boolean;
          data: { message: OrderMessage; conversation: OrderConversation };
        }>(`/conversations/${encodeURIComponent(input.conversationId)}/messages`, {
          method: 'POST',
          body: {
            clientMessageId: input.clientMessageId,
            text: body,
            attachmentIds: input.attachmentIds || [],
          },
        });
        const unwrapped = unwrap<{ message: OrderMessage; conversation: OrderConversation }>(raw);
        return {
          message: { ...unwrapped.message, deliveryStatus: 'sent' },
          conversation: { ...unwrapped.conversation, sourceMode: 'LIVE_API' },
        };
      } catch (err) {
        if (!shouldFallbackToSimulation(err)) throw err;

        const store = readLocalStore();
        const bundle = Object.values(store).find((b) => b.conversation.id === input.conversationId);
        if (!bundle || bundle.conversation.buyerId !== buyerId) {
          throw new ApiError('Không tìm thấy hội thoại.', 404, 'CONVERSATION_NOT_FOUND');
        }

        // Kiểm tra idempotency theo đúng thiết kế BE: UNIQUE(conversation_id, author_id, client_message_id)
        const prior = bundle.messages.find(
          (m) => m.authorId === buyerId && m.clientMessageId === input.clientMessageId,
        );
        if (prior && prior.body !== body) {
          throw new ApiError('Khóa gửi lại thuộc tin khác.', 409, 'CLIENT_MESSAGE_ID_CONFLICT');
        }
        if (prior) {
          return { message: prior, conversation: bundle.conversation };
        }

        if (bundle.conversation.state === 'CLOSED') {
          throw new ApiError(
            'Hội thoại đã đóng sau khi xử lý xong. Bạn chỉ có thể xem lại lịch sử.',
            409,
            'CONVERSATION_CLOSED',
          );
        }

        const nextSeq = bundle.conversation.lastSeq + 1;
        const resolvedAttachments = (input.attachmentIds || [])
          .map((id) => bundle.attachments[id])
          .filter(Boolean);

        const message: OrderMessage = {
          conversationId: bundle.conversation.id,
          seq: nextSeq,
          authorId: buyerId,
          authorName: buyerName,
          authorRole: 'BUYER',
          clientMessageId: input.clientMessageId,
          body,
          attachments: resolvedAttachments.length > 0 ? resolvedAttachments : undefined,
          createdAt: new Date().toISOString(),
          deliveryStatus: 'sent',
        };

        bundle.conversation.lastSeq = nextSeq;
        bundle.conversation.buyerLastReadSeq = nextSeq;
        bundle.conversation.updatedAt = message.createdAt;
        bundle.messages.push(message);
        writeLocalStore(store);

        return {
          message,
          conversation: { ...bundle.conversation },
        };
      }
    },

    /**
     * 4. PUT /api/v1/conversations/:id/read
     * Cập nhật mốc đã đọc của Buyer (chỉ tiến về sau)
     */
    async markAsRead(conversationId: string, lastReadSeq: number): Promise<void> {
      try {
        await request(`/conversations/${encodeURIComponent(conversationId)}/read`, {
          method: 'PUT',
          body: { lastReadSeq },
        });
      } catch (err) {
        if (!shouldFallbackToSimulation(err)) throw err;
        const store = readLocalStore();
        const bundle = Object.values(store).find((b) => b.conversation.id === conversationId);
        if (bundle && lastReadSeq > bundle.conversation.buyerLastReadSeq) {
          bundle.conversation.buyerLastReadSeq = lastReadSeq;
          writeLocalStore(store);
        }
      }
    },

    /**
     * 5. POST /api/v1/conversations/:id/assist
     * Buyer hỏi AI về vận đơn hoặc chính sách
     */
    async askAiAssistant(
      order: OrderDetail,
      buyerId: string,
      buyerName: string,
      input: AssistOrderConversationInput,
    ): Promise<{
      buyerMessage: OrderMessage;
      aiMessage: OrderMessage;
      conversation: OrderConversation;
    }> {
      try {
        const raw = await request<{
          success: boolean;
          data: {
            buyerMessage: OrderMessage;
            aiMessage: OrderMessage;
            conversation: OrderConversation;
          };
        }>(`/conversations/${encodeURIComponent(input.conversationId)}/assist`, {
          method: 'POST',
          body: {
            clientMessageId: input.clientMessageId,
            intent: input.intent,
            question: input.question.trim(),
          },
        });
        return unwrap(raw);
      } catch (err) {
        if (!shouldFallbackToSimulation(err)) throw err;

        const store = readLocalStore();
        const bundle = Object.values(store).find((b) => b.conversation.id === input.conversationId);
        if (!bundle) {
          throw new ApiError('Không tìm thấy hội thoại.', 404, 'CONVERSATION_NOT_FOUND');
        }
        if (bundle.conversation.state === 'CLOSED') {
          throw new ApiError('Hội thoại đã đóng.', 409, 'CONVERSATION_CLOSED');
        }

        const shipment = await fetchReadOnlyOrderShipment(order);
        const now = new Date();
        const buyerSeq = bundle.conversation.lastSeq + 1;
        const buyerMessage: OrderMessage = {
          conversationId: bundle.conversation.id,
          seq: buyerSeq,
          authorId: buyerId,
          authorName: buyerName,
          authorRole: 'BUYER',
          clientMessageId: input.clientMessageId,
          body: input.question.trim(),
          createdAt: now.toISOString(),
          deliveryStatus: 'sent',
        };

        const aiReply = buildAiAssistReply(order, shipment, input);
        const aiSeq = buyerSeq + 1;
        const aiMessage: OrderMessage = {
          conversationId: bundle.conversation.id,
          seq: aiSeq,
          authorId: 'nexus-ai-assistant',
          authorName: 'Trợ lý Nexus',
          authorRole: 'AI',
          clientMessageId: generateClientUuid(),
          body: aiReply.body,
          aiMetadata: aiReply.aiMetadata,
          createdAt: new Date(now.getTime() + 300).toISOString(),
          deliveryStatus: 'sent',
        };

        bundle.conversation.lastSeq = aiSeq;
        bundle.conversation.buyerLastReadSeq = aiSeq;
        bundle.conversation.counterpartLastReadSeq = buyerSeq;
        bundle.conversation.updatedAt = aiMessage.createdAt;
        bundle.messages.push(buyerMessage, aiMessage);
        writeLocalStore(store);

        return {
          buyerMessage,
          aiMessage,
          conversation: { ...bundle.conversation },
        };
      }
    },

    /**
     * 6. POST /api/v1/conversations/:id/handoff
     * Buyer bấm "Gặp nhân viên" để đưa hội thoại Support vào hàng chờ WAITING
     */
    async requestHumanHandoff(
      buyerId: string,
      buyerName: string,
      input: HandoffOrderConversationInput,
    ): Promise<{ conversation: OrderConversation; systemMessage: OrderMessage }> {
      try {
        const raw = await request<{
          success: boolean;
          data: { conversation: OrderConversation; systemMessage: OrderMessage };
        }>(`/conversations/${encodeURIComponent(input.conversationId)}/handoff`, {
          method: 'POST',
          body: {
            topic: input.topic,
            sharedFromSellerConversationId: input.sharedFromSellerConversationId,
            sharedMessageSeqs: input.sharedMessages?.map((m) => m.seq),
          },
        });
        return unwrap(raw);
      } catch (err) {
        if (!shouldFallbackToSimulation(err)) throw err;

        const store = readLocalStore();
        const bundle = Object.values(store).find((b) => b.conversation.id === input.conversationId);
        if (!bundle) {
          throw new ApiError('Không tìm thấy hội thoại.', 404, 'CONVERSATION_NOT_FOUND');
        }
        if (bundle.conversation.state === 'CLOSED') {
          throw new ApiError('Hội thoại đã đóng.', 409, 'CONVERSATION_CLOSED');
        }

        const now = new Date().toISOString();
        let nextSeq = bundle.conversation.lastSeq;

        // Nếu có chia sẻ các tin nhắn mà Buyer đã xác nhận từ luồng Seller sang Support
        if (input.sharedMessages && input.sharedMessages.length > 0) {
          nextSeq += 1;
          const sharedLines = input.sharedMessages.map(
            (m) => `• [#${m.seq} - ${m.authorRole}]: "${m.body}"`,
          );
          bundle.messages.push({
            conversationId: bundle.conversation.id,
            seq: nextSeq,
            authorId: buyerId,
            authorName: buyerName,
            authorRole: 'BUYER',
            clientMessageId: generateClientUuid(),
            body:
              `[Thông tin Buyer xác nhận chia sẻ từ luồng Người bán cho đơn #${bundle.conversation.orderId}]\n` +
              `Chủ đề cần hỗ trợ: ${input.topic}\n` +
              sharedLines.join('\n'),
            createdAt: now,
            deliveryStatus: 'sent',
          });
        }

        nextSeq += 1;
        const systemMessage: OrderMessage = {
          conversationId: bundle.conversation.id,
          seq: nextSeq,
          authorId: 'nexus-ai-assistant',
          authorName: 'Trợ lý Nexus',
          authorRole: 'AI',
          clientMessageId: generateClientUuid(),
          body:
            `Đã chuyển cuộc trò chuyện sang hàng đợi nhân viên Hỗ trợ (Chủ đề: "${input.topic}"). ` +
            `Trạng thái hiện tại: Đang chờ tiếp nhận. Bạn vẫn có thể gửi thêm tin nhắn hoặc đóng trang, lịch sử được lưu trữ an toàn trên hệ thống.`,
          createdAt: now,
          deliveryStatus: 'sent',
        };

        bundle.conversation.state = 'WAITING';
        bundle.conversation.topic = input.topic;
        bundle.conversation.lastSeq = nextSeq;
        bundle.conversation.buyerLastReadSeq = nextSeq;
        bundle.conversation.updatedAt = now;
        bundle.messages.push(systemMessage);
        writeLocalStore(store);

        return {
          conversation: { ...bundle.conversation },
          systemMessage,
        };
      }
    },

    /**
     * 7. POST /api/v1/conversations/:id/attachments
     * Kiểm tra định dạng & kích thước tệp, tạo ID đính kèm và link đọc ngắn hạn
     */
    async uploadAttachment(conversationId: string, file: File): Promise<ConversationAttachment> {
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/pdf',
      ];
      if (!allowedTypes.includes(file.type)) {
        throw new ApiError(
          `Định dạng tệp "${file.name}" không được hỗ trợ. Chỉ chấp nhận ảnh (JPG, PNG, WEBP) hoặc PDF.`,
          422,
          'INVALID_ATTACHMENT_TYPE',
        );
      }
      const maxBytes = 5 * 1024 * 1024; // 5MB
      if (file.size > maxBytes) {
        throw new ApiError(
          `Tệp "${file.name}" vượt quá giới hạn 5MB (${(file.size / (1024 * 1024)).toFixed(2)}MB).`,
          422,
          'ATTACHMENT_TOO_LARGE',
        );
      }

      try {
        const formData = new FormData();
        formData.append('file', file);
        const raw = await request<{ success: boolean; data: ConversationAttachment }>(
          `/conversations/${encodeURIComponent(conversationId)}/attachments`,
          {
            method: 'POST',
            body: formData,
          },
        );
        return unwrap(raw);
      } catch (err) {
        if (!shouldFallbackToSimulation(err)) throw err;

        const store = readLocalStore();
        const bundle = Object.values(store).find((b) => b.conversation.id === conversationId);
        if (!bundle) {
          throw new ApiError('Không tìm thấy hội thoại.', 404, 'CONVERSATION_NOT_FOUND');
        }

        const previewUrl = await new Promise<string>((resolve) => {
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          } else {
            resolve('');
          }
        });

        const attachment: ConversationAttachment = {
          attachmentId: `att_${generateClientUuid().slice(0, 8)}`,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          previewUrl,
          uploadedAt: new Date().toISOString(),
        };

        bundle.attachments[attachment.attachmentId] = attachment;
        writeLocalStore(store);
        return attachment;
      }
    },

    /**
     * 8. POST /api/v1/conversations/:id/cases
     * Sau khi Buyer xem lại và xác nhận, tạo hồ sơ khiếu nại kèm Idempotency-Key
     */
    async createCaseFromConversation(
      buyerId: string,
      buyerName: string,
      input: CreateConversationCaseInput,
    ): Promise<{
      caseSummary: OrderConversationCaseSummary;
      conversation: OrderConversation;
      confirmationMessage: OrderMessage;
    }> {
      const cleanDesc = input.description.trim();
      if (cleanDesc.length < 15 || cleanDesc.length > 1000) {
        throw new ApiError(
          'Mô tả khiếu nại phải từ 15 đến 1000 ký tự.',
          422,
          'INVALID_CASE_DESCRIPTION',
        );
      }
      if (!input.items || input.items.length === 0) {
        throw new ApiError(
          'Vui lòng chọn ít nhất 1 dòng sản phẩm trong đơn hàng.',
          422,
          'MISSING_CASE_ITEMS',
        );
      }

      try {
        const raw = await request<{
          success: boolean;
          data: {
            caseSummary: OrderConversationCaseSummary;
            conversation: OrderConversation;
            confirmationMessage: OrderMessage;
          };
        }>(`/conversations/${encodeURIComponent(input.conversationId)}/cases`, {
          method: 'POST',
          headers: {
            'Idempotency-Key': input.idempotencyKey,
          },
          body: {
            type: input.type,
            items: input.items,
            description: cleanDesc,
            contactPhone: input.contactPhone,
            attachmentIds: input.attachmentIds,
          },
        });
        return unwrap(raw);
      } catch (err) {
        if (!shouldFallbackToSimulation(err)) throw err;

        const store = readLocalStore();
        const bundle = Object.values(store).find((b) => b.conversation.id === input.conversationId);
        if (!bundle) {
          throw new ApiError('Không tìm thấy hội thoại.', 404, 'CONVERSATION_NOT_FOUND');
        }

        // Chống gửi trùng bằng Idempotency-Key
        const existingCase = bundle.idempotentCases[input.idempotencyKey];
        if (existingCase) {
          const lastMsg = bundle.messages[bundle.messages.length - 1];
          return {
            caseSummary: existingCase,
            conversation: { ...bundle.conversation },
            confirmationMessage: lastMsg,
          };
        }

        // Kiểm tra các attachmentId phải thuộc đúng hội thoại hiện tại
        for (const attId of input.attachmentIds) {
          if (!bundle.attachments[attId]) {
            throw new ApiError(
              `Bằng chứng đính kèm (${attId}) không thuộc cuộc hội thoại này.`,
              422,
              'CROSS_CONVERSATION_ATTACHMENT_FORBIDDEN',
            );
          }
        }

        const now = new Date().toISOString();
        const caseId = `CASE-${bundle.conversation.orderId}-${Date.now().toString().slice(-5)}`;
        const caseSummary: OrderConversationCaseSummary = {
          caseId,
          orderId: bundle.conversation.orderId,
          conversationId: bundle.conversation.id,
          type: input.type,
          status: 'OPEN',
          items: input.items,
          description: cleanDesc,
          contactPhone: input.contactPhone,
          attachmentIds: input.attachmentIds,
          createdAt: now,
        };

        bundle.idempotentCases[input.idempotencyKey] = caseSummary;
        bundle.conversation.linkedCases = [caseSummary, ...(bundle.conversation.linkedCases || [])];
        if (bundle.conversation.channel === 'SUPPORT' && bundle.conversation.state === 'OPEN') {
          bundle.conversation.state = 'WAITING';
        }

        const nextSeq = bundle.conversation.lastSeq + 1;
        const resolvedAttachments = input.attachmentIds
          .map((id) => bundle.attachments[id])
          .filter(Boolean);

        const confirmationMessage: OrderMessage = {
          conversationId: bundle.conversation.id,
          seq: nextSeq,
          authorId: buyerId,
          authorName: buyerName,
          authorRole: 'BUYER',
          clientMessageId: input.idempotencyKey,
          body:
            `[HỒ SƠ KHIẾU NẠI #${caseId} ĐÃ ĐƯỢC TẠO]\n` +
            `• Phân loại: ${formatCaseTypeLabel(input.type)}\n` +
            `• Dòng sản phẩm: ${input.items
              .map((it) => `${it.productName} (x${it.quantity})`)
              .join(', ')}\n` +
            `• Mô tả: ${cleanDesc}\n` +
            `• Lưu ý hệ thống: Hồ sơ đang ở trạng thái MỞ (OPEN) chờ Bộ phận Hỗ trợ đối chứng bằng chứng với Người bán. Việc tạo hồ sơ chưa đồng nghĩa duyệt hoàn tiền tự động.`,
          attachments: resolvedAttachments.length > 0 ? resolvedAttachments : undefined,
          createdAt: now,
          deliveryStatus: 'sent',
        };

        bundle.conversation.lastSeq = nextSeq;
        bundle.conversation.buyerLastReadSeq = nextSeq;
        bundle.conversation.updatedAt = now;
        bundle.messages.push(confirmationMessage);
        writeLocalStore(store);

        return {
          caseSummary,
          conversation: { ...bundle.conversation },
          confirmationMessage,
        };
      }
    },

    /**
     * Công cụ mô phỏng phản hồi từ Seller / Support ngay trên trình duyệt
     * giúp kiểm thử đầy đủ vòng đời UI (Seller trả lời, Support nhận việc WAITING -> ASSIGNED,
     * cập nhật trạng thái "Đã đọc", và Đóng hội thoại CLOSED) khi BE chưa bật.
     */
    async simulateCounterpartAction(
      conversationId: string,
      action:
        | 'SELLER_REPLY'
        | 'SUPPORT_CLAIM_AND_REPLY'
        | 'MARK_READ'
        | 'RESOLVE_AND_CLOSE'
        | 'REOPEN_THREAD',
    ): Promise<{ conversation: OrderConversation; messages: OrderMessage[] }> {
      const store = readLocalStore();
      const bundle = Object.values(store).find((b) => b.conversation.id === conversationId);
      if (!bundle) {
        throw new ApiError('Không tìm thấy hội thoại.', 404, 'CONVERSATION_NOT_FOUND');
      }

      const now = new Date().toISOString();
      bundle.conversation.counterpartLastReadSeq = bundle.conversation.lastSeq;

      if (action === 'REOPEN_THREAD') {
        bundle.conversation.state = 'OPEN';
        bundle.conversation.closedAt = null;
        bundle.conversation.updatedAt = now;
        writeLocalStore(store);
        return {
          conversation: { ...bundle.conversation },
          messages: [...bundle.messages],
        };
      }

      if (action === 'MARK_READ') {
        bundle.conversation.updatedAt = now;
        writeLocalStore(store);
        return {
          conversation: { ...bundle.conversation },
          messages: [...bundle.messages],
        };
      }

      if (action === 'SELLER_REPLY') {
        const nextSeq = bundle.conversation.lastSeq + 1;
        bundle.messages.push({
          conversationId: bundle.conversation.id,
          seq: nextSeq,
          authorId: bundle.conversation.recipientKey,
          authorName: bundle.conversation.recipientLabel,
          authorRole: 'SELLER',
          clientMessageId: generateClientUuid(),
          body: `Chào bạn, ${bundle.conversation.recipientLabel} đã nhận được tin nhắn về đơn #${bundle.conversation.orderId}. Shop đã kiểm tra kiện hàng và bàn giao đúng quy cách đóng gói chống sốc cho bưu cục GHN nhé!`,
          createdAt: now,
          deliveryStatus: 'sent',
        });
        bundle.conversation.lastSeq = nextSeq;
        bundle.conversation.updatedAt = now;
      } else if (action === 'SUPPORT_CLAIM_AND_REPLY') {
        bundle.conversation.state = 'ASSIGNED';
        bundle.conversation.assigneeId = 'support_staff_01';
        bundle.conversation.assigneeName = 'Chuyên viên Hỗ trợ Minh Anh';
        const nextSeq = bundle.conversation.lastSeq + 1;
        bundle.messages.push({
          conversationId: bundle.conversation.id,
          seq: nextSeq,
          authorId: 'support_staff_01',
          authorName: 'Chuyên viên Hỗ trợ Minh Anh',
          authorRole: 'SUPPORT_STAFF',
          clientMessageId: generateClientUuid(),
          body: `Xin chào bạn, mình là Minh Anh từ Bộ phận Hỗ trợ Nexus. Mình đã tiếp nhận yêu cầu hỗ trợ cho đơn #${bundle.conversation.orderId} và xem bản tóm tắt trước đó. Mình đang kiểm tra đối chứng vận đơn & bằng chứng cùng Người bán, bạn vui lòng giữ liên lạc nhé.`,
          createdAt: now,
          deliveryStatus: 'sent',
        });
        bundle.conversation.lastSeq = nextSeq;
        bundle.conversation.updatedAt = now;
      } else if (action === 'RESOLVE_AND_CLOSE') {
        bundle.conversation.state = 'CLOSED';
        bundle.conversation.closedAt = now;
        bundle.conversation.ClosedByRole =
          bundle.conversation.channel === 'SUPPORT' ? 'SUPPORT_STAFF' : 'SELLER';
        bundle.conversation.resolutionConclusion =
          bundle.conversation.channel === 'SUPPORT'
            ? 'Đã xác minh tình trạng kiện hàng và đối chiếu bằng chứng hai bên. Hồ sơ hỗ trợ được ghi nhận kết luận hoàn tất.'
            : 'Người bán đã giải đáp xong thắc mắc về tiến độ bàn giao kiện hàng.';

        if (bundle.conversation.linkedCases && bundle.conversation.linkedCases.length > 0) {
          bundle.conversation.linkedCases = bundle.conversation.linkedCases.map((c) => ({
            ...c,
            status: 'RESOLVED',
            resolvedAt: now,
            resolutionSummary:
              'Bộ phận Hỗ trợ đã hoàn tất đối chứng bằng chứng và cập nhật kết luận xử lý.',
          }));
        }

        const nextSeq = bundle.conversation.lastSeq + 1;
        bundle.messages.push({
          conversationId: bundle.conversation.id,
          seq: nextSeq,
          authorId:
            bundle.conversation.channel === 'SUPPORT'
              ? bundle.conversation.assigneeId || 'support_staff_01'
              : bundle.conversation.recipientKey,
          authorName:
            bundle.conversation.channel === 'SUPPORT'
              ? bundle.conversation.assigneeName || 'Bộ phận Hỗ trợ Nexus'
              : bundle.conversation.recipientLabel,
          authorRole: bundle.conversation.channel === 'SUPPORT' ? 'SUPPORT_STAFF' : 'SELLER',
          clientMessageId: generateClientUuid(),
          body: `[KẾT LUẬN & ĐÓNG HỘI THOẠI] ${bundle.conversation.resolutionConclusion}`,
          createdAt: now,
          deliveryStatus: 'sent',
        });
        bundle.conversation.lastSeq = nextSeq;
        bundle.conversation.updatedAt = now;
      }

      writeLocalStore(store);
      return {
        conversation: { ...bundle.conversation },
        messages: [...bundle.messages],
      };
    },
  };
}

export function formatCaseTypeLabel(type: string): string {
  switch (type) {
    case 'DAMAGED_ITEM':
      return 'Hàng bị bể vỡ / hư hỏng khi nhận';
    case 'WRONG_ITEM':
      return 'Giao sai mẫu mã / thiếu số lượng';
    case 'DELIVERY_ISSUE':
      return 'Sự cố giao nhận / chậm trễ vận đơn';
    default:
      return 'Khiếu nại khác cần đối soát';
  }
}

export const orderConversationsApi = createOrderConversationsApi(requestApi);
