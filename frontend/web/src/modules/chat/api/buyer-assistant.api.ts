import { requestApi } from '@/lib/axios/api-client';
import { ApiError, unwrap } from '@/lib/axios/http';
import { catalogApi } from '@/modules/catalog/api/catalog.api';
import { commerceApi } from '@/modules/commerce/api/commerce.api';
import type { OrderDetail, OrderSummary } from '@/modules/commerce/types/order.types';
import type {
  OrderChoiceItem,
  OrderDualStatusCardData,
  PaymentStatusSnapshot,
  PolicyCitationItem,
  ShipmentStatusSnapshot,
} from '../types/buyer-assistant.types';

export type BackendChannelType = 'AI_BOT' | 'BUYER_SELLER' | 'BUYER_SUPPORT';

export interface BackendConversationDto {
  id: string;
  orderId: string;
  channelType: BackendChannelType;
  buyerId: string;
  sellerId: string;
  supportCaseId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackendChatMessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: 'BUYER' | 'SELLER' | 'SUPPORT_STAFF' | 'AI' | 'SYSTEM';
  seq?: number;
  content: string;
  attachments?: Array<{
    url: string;
    mimeType: string;
    filename?: string;
    sizeBytes?: number;
  }>;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DamageAssessmentVerdict {
  is_damaged: boolean;
  damage_type: string;
  severity: string;
  summary: string;
}

export interface BackendChatPolicyDto {
  code: string;
  title: string;
  version: string;
  category?: string;
  summary?: string;
}

export interface PolicyFaqResponse {
  answer: string;
  isGrounded: boolean;
  citations: PolicyCitationItem[];
  canEscalate?: boolean;
}

function formatShipmentStatusVi(status: string): string {
  const normalized = (status || '').toUpperCase().trim();
  switch (normalized) {
    case 'READY_TO_PICK':
    case 'CREATED':
    case 'CHỜ LẤY HÀNG':
      return 'Chờ bưu tá lấy hàng';
    case 'PICKED':
    case 'PICKED_UP':
    case 'PICKING':
    case 'ĐÃ LẤY HÀNG':
      return 'Bưu tá đã lấy kiện hàng';
    case 'IN_TRANSIT':
    case 'TRANSIT':
    case 'ĐANG VẬN CHUYỂN':
      return 'Đang vận chuyển liên tỉnh';
    case 'SHIPPED':
    case 'DELIVERING':
    case 'OUT_FOR_DELIVERY':
    case 'ĐANG GIAO':
    case 'ĐANG GIAO HÀNG':
      return 'Đang trên đường giao hàng';
    case 'DELIVERED':
    case 'SUCCESS':
    case 'COMPLETED':
    case 'ĐÃ GIAO':
    case 'ĐÃ GIAO HÀNG':
      return 'Đã giao hàng thành công';
    case 'FAILED':
    case 'DELIVERY_FAILED':
    case 'CANCELLED':
    case 'GIAO THẤT BẠI':
    case 'GIAO HÀNG THẤT BẠI':
      return 'Giao hàng chưa thành công (Chờ phát lại)';
    case 'RETURNED':
    case 'RTO':
    case 'RETURNING':
    case 'ĐÃ TRẢ HÀNG':
    case 'ĐÃ HOÀN HÀNG':
    case 'HOÀN HÀNG':
      return 'Đã chuyển hoàn về Người bán';
    default:
      if (normalized.includes('THẤT BẠI') || normalized.includes('FAIL')) {
        return 'Giao hàng chưa thành công (Chờ phát lại)';
      }
      if (normalized.includes('HOÀN') || normalized.includes('TRẢ')) {
        return 'Đã chuyển hoàn về Người bán';
      }
      if (normalized.includes('GIAO')) {
        return 'Đang trên đường giao hàng';
      }
      return status || 'Đang cập nhật vận chuyển';
  }
}

export const buyerAssistantApi = {
  /**
   * 1. POST /api/v1/chat/conversations
   * Mở hoặc lấy phòng hội thoại chung ID theo orderId + channelType
   */
  async openConversation(input: {
    orderId: string;
    channelType: BackendChannelType;
    sellerId?: string;
  }): Promise<BackendConversationDto> {
    const raw = await requestApi<{ success: boolean; data: BackendConversationDto }>(
      '/chat/conversations',
      {
        method: 'POST',
        body: {
          orderId: input.orderId,
          channelType: input.channelType,
          sellerId: input.sellerId,
        },
      },
    );
    return unwrap<BackendConversationDto>(raw);
  },

  /**
   * 1.1 GET /api/v1/chat/conversations/:id
   */
  async getConversation(conversationId: string): Promise<BackendConversationDto> {
    const raw = await requestApi<{ success: boolean; data: BackendConversationDto }>(
      `/chat/conversations/${encodeURIComponent(conversationId)}`,
    );
    return unwrap<BackendConversationDto>(raw);
  },

  /**
   * 2. GET /api/v1/chat/orders/:orderId/conversations
   */
  async listOrderConversations(orderId: string): Promise<BackendConversationDto[]> {
    const raw = await requestApi<{ success: boolean; data: BackendConversationDto[] }>(
      `/chat/orders/${encodeURIComponent(orderId)}/conversations`,
    );
    const items = unwrap<BackendConversationDto[]>(raw);
    return Array.isArray(items) ? items : [];
  },

  /**
   * 3. GET /api/v1/chat/conversations/:id/messages
   */
  async getMessages(
    conversationId: string,
    options?: { limit?: number; after?: string | number; signal?: AbortSignal },
  ): Promise<BackendChatMessageDto[]> {
    const params = new URLSearchParams();
    if (options?.limit !== undefined) params.set('limit', String(options.limit));
    if (options?.after !== undefined) params.set('after', String(options.after));
    const qs = params.toString() ? `?${params}` : '';
    const raw = await requestApi<{ success: boolean; data: BackendChatMessageDto[] }>(
      `/chat/conversations/${encodeURIComponent(conversationId)}/messages${qs}`,
      { signal: options?.signal },
    );
    const list = unwrap<BackendChatMessageDto[]>(raw);
    return Array.isArray(list) ? list : [];
  },

  /**
   * 4. POST /api/v1/chat/conversations/:id/messages
   * Hỗ trợ clientMessageId (Idempotency) và context (ngữ cảnh trang) cho AI Engine.
   */
  async sendMessage(
    conversationId: string,
    content: string,
    attachments?: Array<{ url: string; mimeType: string; filename?: string; sizeBytes?: number }>,
    options?: {
      clientMessageId?: string;
      context?: {
        pageKind?: string;
        productId?: string;
        auctionId?: string;
        orderId?: string;
      };
    },
  ): Promise<{ message: BackendChatMessageDto; reply?: BackendChatMessageDto | null }> {
    const raw = await requestApi<{
      success: boolean;
      data: { message: BackendChatMessageDto; reply?: BackendChatMessageDto | null };
    }>(`/chat/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST',
      body: {
        content,
        attachments,
        clientMessageId: options?.clientMessageId,
        context: options?.context,
      },
    });
    return unwrap<{ message: BackendChatMessageDto; reply?: BackendChatMessageDto | null }>(raw);
  },

  /**
   * 4.1 PUT /api/v1/chat/conversations/:id/read
   */
  async markAsRead(conversationId: string, lastReadSeq: number): Promise<void> {
    await requestApi(`/chat/conversations/${encodeURIComponent(conversationId)}/read`, {
      method: 'PUT',
      body: { lastReadSeq },
    });
  },

  /**
   * 4.2 POST /api/v1/chat/handover
   * Chuyển phòng AI_BOT sang hàng chờ nhân viên CSKH (`WAITING_STAFF`)
   */
  async requestBotHandover(
    conversationId: string,
    userId: string,
  ): Promise<BackendConversationDto> {
    const raw = await requestApi<{ success: boolean; data: BackendConversationDto }>(
      '/chat/handover',
      {
        method: 'POST',
        body: { conversationId, userId },
      },
    );
    return unwrap<BackendConversationDto>(raw);
  },

  /**
   * 4.3 POST /api/v1/chat/assess-image
   * Gọi AI thẩm định nhanh ảnh sản phẩm hư hỏng / sai hàng
   */
  async assessDamageImage(input: {
    imageBase64: string;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
    expectedItem?: string;
  }): Promise<DamageAssessmentVerdict> {
    const raw = await requestApi<{ success: boolean; data: DamageAssessmentVerdict }>(
      '/chat/assess-image',
      {
        method: 'POST',
        body: input,
      },
    );
    return unwrap<DamageAssessmentVerdict>(raw);
  },

  /**
   * 4.4 POST /api/v1/chat/ask
   * Hỏi đáp trực tiếp với Google Gemini AI theo ngữ cảnh trang hiện tại
   */
  async askAi(
    question: string,
    context?: Record<string, unknown>,
  ): Promise<{ answer: string; modelUsed: string; isLiveAi: boolean }> {
    const raw = await requestApi<{
      success: boolean;
      data: { answer: string; modelUsed: string; isLiveAi: boolean };
    }>('/chat/ask', {
      method: 'POST',
      body: { question, context },
    });
    return unwrap<{ answer: string; modelUsed: string; isLiveAi: boolean }>(raw);
  },

  /**
   * 5. POST /api/v1/chat/faq
   * Tra cứu chính sách công khai khi chưa chọn đơn hoặc khách chưa đăng nhập
   */
  async queryFaq(query: string, category?: string): Promise<PolicyFaqResponse> {
    const raw = await requestApi<{ success: boolean; data: PolicyFaqResponse }>('/chat/faq', {
      method: 'POST',
      body: { query, category },
    });
    return unwrap<PolicyFaqResponse>(raw);
  },

  /**
   * 5.1 GET /api/v1/chat/policies
   * Danh sách các quy chế sàn đang có hiệu lực
   */
  async listPolicies(): Promise<BackendChatPolicyDto[]> {
    const raw = await requestApi<{ success: boolean; data: BackendChatPolicyDto[] }>(
      '/chat/policies',
    );
    const list = unwrap<BackendChatPolicyDto[]>(raw);
    return Array.isArray(list) ? list : [];
  },

  /**
   * 6. GET /api/v1/orders?buyerId=... & GET /api/v1/orders/:id
   * Chỉ đọc danh sách đơn của chính Buyer, có ghép ảnh sản phẩm cho bộ chọn đơn.
   */
  async listBuyerOrdersWithThumbnails(buyerId: string, limit = 12): Promise<OrderChoiceItem[]> {
    const page = await commerceApi.listOrders({ buyerId, page: 1, limit });
    const items = page.items || [];

    const enriched = await Promise.all(
      items.map(async (order) => {
        let imageUrl: string | null = null;
        let sellerId: string | undefined;
        let title = order.product || `Đơn hàng #${order.id}`;

        try {
          const detail = await commerceApi.getOrder(order.id);
          sellerId = detail.sellerId;
          const firstItem = detail.items?.[0];
          if (firstItem) {
            if (firstItem.productName) {
              title =
                detail.items.length > 1
                  ? `${firstItem.productName} (+${detail.items.length - 1} món)`
                  : firstItem.productName;
            }
            if (firstItem.imageUrl) {
              imageUrl = firstItem.imageUrl;
            } else if (firstItem.productId) {
              const catalogItem = await catalogApi.detail(firstItem.productId).catch(() => null);
              if (catalogItem && Array.isArray(catalogItem.images) && catalogItem.images[0]) {
                imageUrl = catalogItem.images[0];
              }
            }
          }
        } catch {
          // Giữ dữ liệu tóm tắt sẵn có từ listOrders nếu getOrder chi tiết lỗi
        }

        return {
          id: order.id,
          title,
          imageUrl,
          createdAt: order.createdAt || order.date,
          status: order.status,
          totalAmount: order.totalAmount ?? order.total ?? 0,
          sellerId,
        } satisfies OrderChoiceItem;
      }),
    );

    return enriched;
  },

  /**
   * Kiểm tra xem một orderId có thuộc về Buyer hiện tại hay không.
   * Trả về null nếu không có quyền hoặc không tồn tại — không làm lộ thông tin đơn người khác.
   */
  async getOwnedOrderDetail(orderId: string, buyerId: string): Promise<OrderDetail | null> {
    try {
      const cleanId = orderId
        .trim()
        .replace(/^#/, '')
        .replace(/^NEX-TRK-/i, '')
        .trim();
      const detail = await commerceApi.getOrder(cleanId);
      if (detail.buyerId && detail.buyerId !== buyerId) {
        return null;
      }
      return detail;
    } catch {
      return null;
    }
  },

  /**
   * 7. GET /api/v1/orders/:id/payment-status + GET /api/v1/fulfillments/shipments/by-order/:orderId?readOnly=true
   * Tổng hợp 2 dòng trạng thái độc lập: Thanh toán và Vận chuyển, tuyệt đối không bịa dữ liệu.
   */
  async inspectOrderDualStatus(
    order: OrderDetail | OrderSummary,
  ): Promise<OrderDualStatusCardData> {
    const detail =
      'items' in order ? order : await commerceApi.getOrder(order.id).catch(() => null);
    const effectiveOrder = detail || order;
    const normalizedOrderStatus = (effectiveOrder.status || '').toUpperCase();

    // 1. Phân giải chính xác Phương thức thanh toán (COD vs PAYOS)
    let rawPaymentMethod = (
      ('paymentMethod' in effectiveOrder && typeof effectiveOrder.paymentMethod === 'string'
        ? effectiveOrder.paymentMethod
        : '') || ''
    )
      .trim()
      .toUpperCase();

    const timelineNotes = ((effectiveOrder as any).timeline || [])
      .map((t: any) => `${t.title || ''} ${t.note || ''}`)
      .join(' ')
      .toUpperCase();

    const addressMethod = String(
      (effectiveOrder as any).shippingAddress?.paymentMethod ||
        (effectiveOrder as any).shippingAddress?.method ||
        '',
    )
      .trim()
      .toUpperCase();

    if (
      /COD|TIỀN MẶT|NHẬN HÀNG/i.test(timelineNotes) ||
      rawPaymentMethod === 'COD' ||
      rawPaymentMethod.includes('NHẬN HÀNG') ||
      addressMethod === 'COD' ||
      addressMethod.includes('NHẬN HÀNG')
    ) {
      rawPaymentMethod = 'COD';
    } else if (
      /PAYOS|VIETQR/i.test(timelineNotes) ||
      rawPaymentMethod === 'PAYOS' ||
      addressMethod === 'PAYOS'
    ) {
      rawPaymentMethod = 'PAYOS';
    }

    // Dòng 1: Trạng thái thanh toán thực tế từ Commerce
    let payment: PaymentStatusSnapshot = {
      status: rawPaymentMethod === 'COD' ? 'COD' : 'UNKNOWN',
      method: rawPaymentMethod === 'COD' ? 'COD' : 'PAYOS',
      methodLabel:
        rawPaymentMethod === 'COD'
          ? 'Thanh toán khi nhận hàng (COD)'
          : 'Chuyển khoản PayOS (VietQR)',
      label:
        rawPaymentMethod === 'COD' ? 'Thu tiền khi nhận hàng (COD)' : 'Đang kiểm tra thanh toán',
      amount: effectiveOrder.totalAmount ?? effectiveOrder.total,
    };

    try {
      const payRes = await commerceApi.getPaymentStatus(effectiveOrder.id);
      const paySt = (payRes.paymentStatus || '').toUpperCase();
      const ordSt = (payRes.orderStatus || normalizedOrderStatus).toUpperCase();

      const resolvedMethod = (
        (payRes.paymentMethod && payRes.paymentMethod !== 'STRIPE' ? payRes.paymentMethod : '') ||
        rawPaymentMethod ||
        (payRes.checkoutUrl ? 'PAYOS' : 'COD')
      )
        .trim()
        .toUpperCase();

      const isCod =
        resolvedMethod === 'COD' ||
        resolvedMethod.includes('NHẬN HÀNG') ||
        resolvedMethod === 'CASH_ON_DELIVERY' ||
        /COD|TIỀN MẶT|NHẬN HÀNG/i.test(timelineNotes);

      if (isCod) {
        payment.method = 'COD';
        payment.methodLabel = 'Thanh toán khi nhận hàng (COD)';
        if (ordSt === 'CANCELLED') {
          payment.status = 'CANCELLED';
          payment.label = 'Đơn đã hủy (Không thu tiền)';
        } else if (ordSt === 'DELIVERED' && (paySt === 'PAID' || paySt === 'COLLECTED')) {
          payment.status = 'PAID';
          payment.label = 'Đã thu tiền khi giao hàng';
          payment.paidAt = payRes.paidAt || effectiveOrder.updatedAt;
        } else {
          payment.status = 'COD';
          payment.label = 'Thu tiền khi nhận hàng (COD)';
        }
      } else {
        payment.method = 'PAYOS';
        payment.methodLabel = 'Chuyển khoản PayOS (VietQR)';
        if (paySt === 'PAID' || ordSt === 'PAID') {
          payment.status = 'PAID';
          payment.label = 'Đã thanh toán thành công';
          payment.paidAt = payRes.paidAt;
        } else if (ordSt === 'CANCELLED') {
          payment.status = 'CANCELLED';
          payment.label = 'Đơn đã hủy';
        } else if (payRes.expired || ordSt === 'EXPIRED') {
          payment.status = 'EXPIRED';
          payment.label = 'Đã quá hạn thanh toán';
          payment.expiresAt = payRes.expiresAt;
        } else {
          payment.status = 'PENDING';
          payment.label = 'Chờ chuyển khoản VietQR';
          payment.expiresAt = payRes.expiresAt;
          payment.canRetryPaymentCheck = true;
        }
      }
    } catch {
      const isCod =
        rawPaymentMethod === 'COD' ||
        rawPaymentMethod.includes('NHẬN HÀNG') ||
        /COD|TIỀN MẶT|NHẬN HÀNG/i.test(timelineNotes);

      if (isCod) {
        payment = {
          status: normalizedOrderStatus === 'DELIVERED' ? 'PAID' : 'COD',
          method: 'COD',
          methodLabel: 'Thanh toán khi nhận hàng (COD)',
          label:
            normalizedOrderStatus === 'DELIVERED'
              ? 'Đã thu tiền khi giao hàng'
              : 'Thu tiền khi nhận hàng (COD)',
          amount: effectiveOrder.totalAmount ?? effectiveOrder.total,
        };
      } else if (['PAID'].includes(normalizedOrderStatus)) {
        payment = {
          status: 'PAID',
          method: 'PAYOS',
          methodLabel: 'Chuyển khoản PayOS (VietQR)',
          label: 'Đã thanh toán thành công',
          amount: effectiveOrder.totalAmount ?? effectiveOrder.total,
        };
      } else {
        payment = {
          status: 'PENDING',
          method: 'PAYOS',
          methodLabel: 'Chuyển khoản PayOS (VietQR)',
          label: 'Chờ chuyển khoản VietQR',
          amount: effectiveOrder.totalAmount ?? effectiveOrder.total,
          canRetryPaymentCheck: true,
        };
      }
    }

    // Dòng 2: Trạng thái vận chuyển chỉ đọc từ Fulfillment (`?readOnly=true`)
    let shipment: ShipmentStatusSnapshot = {
      state: 'NO_SHIPMENT_INFO',
      label: 'Chưa có thông tin vận chuyển',
    };

    try {
      const cacheBuster = `_t=${Date.now()}`;
      const raw = await requestApi<{
        success?: boolean;
        data?: {
          carrier?: string;
          carrierCode?: string;
          trackingCode?: string;
          status?: string;
          statusCode?: string;
          currentLocation?: string;
          updatedAt?: string;
          updated?: string;
          estimatedDeliveryAt?: string | null;
        } | null;
      }>(
        `/fulfillments/shipments/by-order/${encodeURIComponent(effectiveOrder.id)}?readOnly=true&${cacheBuster}`,
        { headers: { 'Cache-Control': 'no-cache, no-store' } },
      );

      const shipData = unwrap<{
        carrier?: string;
        carrierCode?: string;
        trackingCode?: string;
        status?: string;
        statusCode?: string;
        currentLocation?: string;
        updatedAt?: string;
        updated?: string;
        estimatedDeliveryAt?: string | null;
      } | null>(raw);

      if (shipData && (shipData.trackingCode || shipData.status || shipData.statusCode)) {
        const rawStatus = (shipData.statusCode || shipData.status || '').toUpperCase().trim();
        let displayLocation = (shipData.currentLocation || '').trim();

        // Chuẩn hóa canonical status code
        let canonicalStatusCode = 'READY_TO_PICK';
        if (
          rawStatus === 'FAILED' ||
          rawStatus.includes('FAIL') ||
          rawStatus.includes('THẤT BẠI')
        ) {
          canonicalStatusCode = 'FAILED';
        } else if (
          rawStatus === 'RETURNED' ||
          rawStatus.includes('RETURN') ||
          rawStatus.includes('HOÀN') ||
          rawStatus.includes('TRẢ')
        ) {
          canonicalStatusCode = 'RETURNED';
        } else if (
          rawStatus === 'DELIVERED' ||
          rawStatus.includes('ĐÃ GIAO') ||
          rawStatus.includes('SUCCESS') ||
          rawStatus.includes('COMPLETED')
        ) {
          canonicalStatusCode = 'DELIVERED';
        } else if (
          rawStatus === 'OUT_FOR_DELIVERY' ||
          rawStatus === 'DELIVERING' ||
          rawStatus === 'SHIPPED' ||
          rawStatus.includes('ĐANG GIAO')
        ) {
          canonicalStatusCode = 'OUT_FOR_DELIVERY';
        } else if (
          rawStatus === 'IN_TRANSIT' ||
          rawStatus.includes('TRANSIT') ||
          rawStatus.includes('VẬN CHUYỂN')
        ) {
          canonicalStatusCode = 'IN_TRANSIT';
        } else if (rawStatus === 'PICKED' || rawStatus.includes('LẤY HÀNG')) {
          canonicalStatusCode = 'PICKED';
        }

        // Tự động đồng bộ vị trí hiển thị chuẩn xác với từng trạng thái để tránh mâu thuẫn vị trí kho cũ
        const isConflict =
          !displayLocation ||
          (canonicalStatusCode !== 'READY_TO_PICK' &&
            /đang chờ lấy hàng|chờ lấy hàng/i.test(displayLocation)) ||
          (canonicalStatusCode === 'DELIVERED' && !/đã giao/i.test(displayLocation)) ||
          ((canonicalStatusCode === 'OUT_FOR_DELIVERY' || canonicalStatusCode === 'FAILED') &&
            /kho tổng|chờ lấy hàng|trung chuyển/i.test(displayLocation));

        if (isConflict) {
          switch (canonicalStatusCode) {
            case 'READY_TO_PICK':
              displayLocation = 'Kho tổng Nexus · Đang chuẩn bị đóng gói & chờ bưu tá';
              break;
            case 'PICKED':
              displayLocation = 'Bưu cục đối tác · Bưu tá đã nhận kiện hàng từ Người bán';
              break;
            case 'IN_TRANSIT':
              displayLocation = 'Trung tâm phân loại bưu chính · Đang vận chuyển liên tỉnh';
              break;
            case 'OUT_FOR_DELIVERY':
              displayLocation = 'Bưu cục phát địa phương · Bưu tá đang đi giao hàng';
              break;
            case 'DELIVERED':
              displayLocation = 'Địa chỉ người nhận · Đã phát thành công';
              break;
            case 'FAILED':
              displayLocation = 'Bưu cục phát địa phương · Giao không thành công (Chờ phát lại)';
              break;
            case 'RETURNED':
              displayLocation = 'Trung tâm chuyển hoàn · Đã trả hàng về người bán';
              break;
            default:
              displayLocation = displayLocation || 'Đang cập nhật vị trí';
              break;
          }
        }

        shipment = {
          state: 'HAS_SHIPMENT',
          label: formatShipmentStatusVi(canonicalStatusCode),
          carrier: shipData.carrier || shipData.carrierCode || undefined,
          trackingCode: shipData.trackingCode || undefined,
          currentLocation: displayLocation || undefined,
          updatedAt: shipData.updatedAt || shipData.updated || null,
          estimatedDeliveryAt: shipData.estimatedDeliveryAt ?? null,
        };
      } else {
        shipment = deriveNoShipmentState(payment.status, normalizedOrderStatus, effectiveOrder);
      }
    } catch (err) {
      const status = err instanceof ApiError ? err.status : undefined;
      if (status === 404) {
        shipment = deriveNoShipmentState(payment.status, normalizedOrderStatus, effectiveOrder);
      } else {
        // Phân biệt rõ lỗi gián đoạn dịch vụ Fulfillment với việc chưa tạo kiện hàng
        shipment = {
          state: 'INTERRUPTED',
          label: 'Tạm thời chưa kết nối được dịch vụ vận chuyển',
        };
      }
    }

    const canCancel = ['PENDING', 'PENDING_PAYMENT', 'CREATED', 'PLACED', 'PAID'].includes(
      normalizedOrderStatus,
    );

    return {
      orderId: effectiveOrder.id,
      orderNumberLabel: `#${effectiveOrder.id}`,
      totalAmount: effectiveOrder.totalAmount ?? effectiveOrder.total ?? 0,
      payment,
      shipment,
      canCancel,
      canComplain: normalizedOrderStatus !== 'CANCELLED',
    };
  },
};

function deriveNoShipmentState(
  paymentStatus: PaymentStatusSnapshot['status'],
  orderStatus: string,
  order: OrderDetail | OrderSummary,
): ShipmentStatusSnapshot {
  const rawTracking =
    order.tracking && order.tracking !== '—' && !order.tracking.startsWith('NEX-TRK-')
      ? order.tracking
      : '';

  if (rawTracking || orderStatus === 'SHIPPED' || orderStatus === 'DELIVERED') {
    return {
      state: 'HAS_SHIPMENT',
      label:
        orderStatus === 'DELIVERED'
          ? 'Đã giao hàng thành công'
          : orderStatus === 'SHIPPED'
            ? 'Đang trên đường giao hàng'
            : 'Đã ghi nhận mã vận đơn',
      trackingCode: rawTracking || undefined,
      updatedAt: order.updatedAt || order.createdAt,
      estimatedDeliveryAt: null,
    };
  }

  if (paymentStatus === 'PAID') {
    if (['PAID', 'PROCESSING', 'CONFIRMED', 'PACKING'].includes(orderStatus)) {
      return {
        state: 'PREPARING',
        label: 'Đơn đã thanh toán. Shop đang chuẩn bị hàng',
      };
    }
    return {
      state: 'NO_SHIPMENT_INFO',
      label: 'Đơn đã thanh toán. Chưa có thông tin vận chuyển',
    };
  }

  if (paymentStatus === 'COD') {
    return {
      state: 'PREPARING',
      label: 'Đơn COD đang chờ Shop xác nhận & bàn giao vận chuyển',
    };
  }

  if (paymentStatus === 'CANCELLED' || orderStatus === 'CANCELLED') {
    return {
      state: 'UNPAID',
      label: 'Đơn đã hủy — không phát sinh vận chuyển',
    };
  }

  return {
    state: 'UNPAID',
    label: 'Chưa có vận đơn (đang chờ hoàn tất thanh toán)',
  };
}
