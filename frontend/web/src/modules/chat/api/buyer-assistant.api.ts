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
  const normalized = (status || '').toUpperCase();
  switch (normalized) {
    case 'READY_TO_PICK':
    case 'CREATED':
      return 'Chờ bưu tá lấy hàng';
    case 'PICKED':
    case 'PICKED_UP':
      return 'Bưu tá đã lấy kiện hàng';
    case 'IN_TRANSIT':
    case 'SHIPPED':
    case 'DELIVERING':
    case 'OUT_FOR_DELIVERY':
      return 'Đang trên đường giao hàng';
    case 'DELIVERED':
      return 'Đã giao hàng thành công';
    case 'DELIVERY_FAILED':
      return 'Giao hàng chưa thành công (Chờ phát lại)';
    case 'RETURNED':
    case 'RTO':
      return 'Đang hoàn về kho Người bán';
    default:
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
      const detail = await commerceApi.getOrder(orderId);
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
    const rawPaymentMethod =
      'paymentMethod' in effectiveOrder && typeof effectiveOrder.paymentMethod === 'string'
        ? effectiveOrder.paymentMethod
        : '';
    const paymentMethod = rawPaymentMethod.toUpperCase();

    // Dòng 1: Trạng thái thanh toán thực tế từ Commerce
    let payment: PaymentStatusSnapshot = {
      status: 'UNKNOWN',
      label: 'Đang kiểm tra trạng thái thanh toán',
      amount: effectiveOrder.totalAmount ?? effectiveOrder.total,
    };

    try {
      const payRes = await commerceApi.getPaymentStatus(effectiveOrder.id);
      const paySt = (payRes.paymentStatus || '').toUpperCase();
      const ordSt = (payRes.orderStatus || normalizedOrderStatus).toUpperCase();

      if (paySt === 'PAID' || ordSt === 'PAID' || ordSt === 'SHIPPED' || ordSt === 'DELIVERED') {
        payment = {
          status: 'PAID',
          label: 'Đã thanh toán',
          paidAt: payRes.paidAt,
          amount: payRes.amount ?? effectiveOrder.totalAmount,
        };
      } else if (ordSt === 'CANCELLED') {
        payment = {
          status: 'CANCELLED',
          label: 'Đơn đã hủy',
          amount: payRes.amount,
        };
      } else if (payRes.expired || ordSt === 'EXPIRED') {
        payment = {
          status: 'EXPIRED',
          label: 'Đã quá hạn thanh toán',
          expiresAt: payRes.expiresAt,
          amount: payRes.amount,
        };
      } else if (paymentMethod === 'COD' || ordSt === 'PLACED') {
        payment = {
          status: 'COD',
          label: `Thanh toán khi nhận hàng (COD · ${(
            payRes.amount ??
            effectiveOrder.totalAmount ??
            0
          ).toLocaleString('vi-VN')} ₫)`,
          amount: payRes.amount ?? effectiveOrder.totalAmount,
        };
      } else {
        payment = {
          status: 'PENDING',
          label: 'Giao dịch PayOS chưa hoàn tất',
          expiresAt: payRes.expiresAt,
          amount: payRes.amount,
          canRetryPaymentCheck: true,
        };
      }
    } catch {
      if (paymentMethod === 'COD' || normalizedOrderStatus === 'PLACED') {
        payment = {
          status: 'COD',
          label: `Thanh toán khi nhận hàng (COD · ${(
            effectiveOrder.totalAmount ??
            effectiveOrder.total ??
            0
          ).toLocaleString('vi-VN')} ₫)`,
          amount: effectiveOrder.totalAmount ?? effectiveOrder.total,
        };
      } else if (['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(normalizedOrderStatus)) {
        payment = {
          status: 'PAID',
          label: 'Đã thanh toán',
          amount: effectiveOrder.totalAmount ?? effectiveOrder.total,
        };
      } else if (normalizedOrderStatus === 'CANCELLED') {
        payment = { status: 'CANCELLED', label: 'Đơn đã hủy' };
      } else {
        payment = {
          status: 'ERROR',
          label: 'Chưa xác nhận được trạng thái thanh toán',
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
      }>(`/fulfillments/shipments/by-order/${encodeURIComponent(effectiveOrder.id)}?readOnly=true`);

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
        shipment = {
          state: 'HAS_SHIPMENT',
          label: formatShipmentStatusVi(shipData.statusCode || shipData.status || ''),
          carrier: shipData.carrier || shipData.carrierCode || undefined,
          trackingCode: shipData.trackingCode || undefined,
          currentLocation: shipData.currentLocation || undefined,
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
