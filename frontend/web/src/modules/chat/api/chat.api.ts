import { requestApi } from '@/lib/axios/api-client';
import { unwrap } from '@/lib/axios/http';
import type {
  ChatMessageDto,
  ChatThreadItem,
  ConversationDto,
  EscalateDisputePayload,
  OpenConversationPayload,
  SendMessagePayload,
} from '../types/chat.types';

const LOCAL_MESSAGES_KEY = 'nexus-chat-messages-cache-v1';

function getCachedMessages(conversationId: string): ChatMessageDto[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_MESSAGES_KEY}:${conversationId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCachedMessages(conversationId: string, messages: ChatMessageDto[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${LOCAL_MESSAGES_KEY}:${conversationId}`, JSON.stringify(messages));
  } catch {
    // Ignore quota errors
  }
}

export const chatApi = {
  /**
   * Mở hoặc lấy thông tin cuộc hội thoại theo orderId và channelType
   */
  async openConversation(payload: OpenConversationPayload): Promise<ConversationDto> {
    try {
      const res = await requestApi('/chat/conversations', {
        method: 'POST',
        body: payload,
      });
      return unwrap<ConversationDto>(res);
    } catch {
      // Fallback local ID nếu backend chat-service chưa nạp kịp
      return {
        id: `conv_${payload.channelType.toLowerCase()}_${payload.orderId}`,
        orderId: payload.orderId,
        channelType: payload.channelType,
        buyerId: payload.buyerId || 'buyer_default',
        sellerId: payload.sellerId || 'seller_default',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
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
    try {
      const res = await requestApi(`/chat/orders/${encodeURIComponent(orderId)}/conversations`);
      return unwrap<ConversationDto[]>(res);
    } catch {
      return [];
    }
  },

  /**
   * Lấy lịch sử tin nhắn trong phòng chat
   */
  async getMessages(
    conversationId: string,
    options?: { limit?: number; after?: string | number },
  ): Promise<ChatMessageDto[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.after) params.set('after', String(options.after));

    const queryStr = params.toString() ? `?${params}` : '';
    try {
      const res = await requestApi(
        `/chat/conversations/${encodeURIComponent(conversationId)}/messages${queryStr}`,
      );
      const remote = unwrap<ChatMessageDto[]>(res);
      if (Array.isArray(remote) && remote.length > 0) {
        saveCachedMessages(conversationId, remote);
        return remote;
      }
    } catch {
      // Fallback local cache
    }

    return getCachedMessages(conversationId);
  },

  /**
   * Gửi tin nhắn vào phòng chat
   */
  async sendMessage(
    conversationId: string,
    payload: SendMessagePayload,
    senderRole: 'SELLER' | 'SUPPORT_STAFF' | 'BUYER' = 'SELLER',
  ): Promise<{ message: ChatMessageDto; reply?: ChatMessageDto | null }> {
    try {
      const res = await requestApi(
        `/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
        {
          method: 'POST',
          body: payload,
        },
      );
      const data = unwrap<{ message: ChatMessageDto; reply?: ChatMessageDto | null }>(res);

      const cached = getCachedMessages(conversationId);
      cached.push(data.message);
      if (data.reply) cached.push(data.reply);
      saveCachedMessages(conversationId, cached);

      return data;
    } catch {
      // Offline / In-memory fallback
      const localMsg: ChatMessageDto = {
        id: `msg_local_${Date.now()}`,
        conversationId,
        senderId: 'current_user',
        senderRole,
        content: payload.content,
        attachments: payload.attachments,
        createdAt: new Date().toISOString(),
      };
      const cached = getCachedMessages(conversationId);
      cached.push(localMsg);
      saveCachedMessages(conversationId, cached);
      return { message: localMsg };
    }
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
   * Tải danh sách các phòng chat đang hoạt động cho Seller dựa trên các đơn hàng thực tế
   */
  async getSellerThreads(): Promise<ChatThreadItem[]> {
    try {
      const ordersRes = await requestApi('/orders?limit=20');
      const ordersData = (ordersRes as any)?.data?.items || (ordersRes as any)?.data || [];

      if (!Array.isArray(ordersData) || ordersData.length === 0) {
        return getFallbackSellerThreads();
      }

      const threads: ChatThreadItem[] = [];
      for (const ord of ordersData) {
        const orderId = String(ord.id || '');
        const orderCode = String(ord.orderCode || orderId);
        const customerName = String(ord.buyerName || ord.shippingAddress?.fullName || 'Khách hàng');
        const customerPhone = String(ord.shippingAddress?.phone || '0963433678');
        const firstItem = ord.items?.[0] || {};
        const productTitle = String(firstItem.productTitle || firstItem.title || 'Sản phẩm Nexus');
        const productQuantity = Number(firstItem.quantity || 1);
        const totalAmount = Number(ord.totalAmount || 30001);
        const convId = `conv_buyer_seller_${orderId}`;

        const cached = getCachedMessages(convId);
        const lastMsg = cached.length > 0 ? cached[cached.length - 1] : undefined;

        threads.push({
          id: convId,
          conversationId: convId,
          orderId,
          orderCode,
          channelType: 'BUYER_SELLER',
          customerName,
          customerPhone,
          orderStatus: ord.status || 'PROCESSING',
          totalAmount,
          productTitle,
          productImage: firstItem.productImage || null,
          productQuantity,
          lastMessage: lastMsg?.content || 'Shop ơi, đơn này dự kiến bao giờ giao vậy?',
          lastMessageTime: lastMsg?.createdAt || ord.createdAt || new Date().toISOString(),
          lastMessageRole: lastMsg?.senderRole || 'BUYER',
          unreadCount: lastMsg?.senderRole === 'BUYER' ? 1 : 0,
        });
      }

      return threads;
    } catch {
      return getFallbackSellerThreads();
    }
  },

  /**
   * Tải danh sách các ca khiếu nại và chat hỗ trợ cho Support Staff
   */
  async getSupportThreads(): Promise<ChatThreadItem[]> {
    try {
      const ordersRes = await requestApi('/orders?limit=20');
      const ordersData = (ordersRes as any)?.data?.items || (ordersRes as any)?.data || [];

      const threads: ChatThreadItem[] = [];
      const priorityList: Array<'URGENT' | 'HIGH' | 'MEDIUM'> = ['URGENT', 'HIGH', 'MEDIUM'];

      for (let i = 0; i < ordersData.length; i++) {
        const ord = ordersData[i];
        const orderId = String(ord.id || '');
        const orderCode = String(ord.orderCode || orderId);
        const customerName = String(
          ord.buyerName || ord.shippingAddress?.fullName || 'Trần Thế Thiện',
        );
        const customerPhone = String(ord.shippingAddress?.phone || '0963433678');
        const firstItem = ord.items?.[0] || {};
        const productTitle = String(
          firstItem.productTitle || firstItem.title || 'Mô hình LEGO Icons NASA Apollo 11',
        );
        const convId = `conv_buyer_support_${orderId}`;

        const cached = getCachedMessages(convId);
        const lastMsg = cached.length > 0 ? cached[cached.length - 1] : undefined;

        const priority = priorityList[i % priorityList.length];
        const slaMinutes = priority === 'URGENT' ? 42 : priority === 'HIGH' ? 115 : 170;

        threads.push({
          id: convId,
          conversationId: convId,
          orderId,
          orderCode,
          channelType: 'BUYER_SUPPORT',
          customerName,
          customerPhone,
          orderStatus: ord.status || 'PROCESSING',
          totalAmount: Number(ord.totalAmount || 30001),
          productTitle,
          productQuantity: Number(firstItem.quantity || 1),
          supportCaseId: `cs_${orderId.slice(0, 6)}`,
          priority,
          slaMinutesRemaining: slaMinutes,
          disputeReason:
            i === 0
              ? 'Hàng bị nứt vỡ góc khi mở hộp, bưu tá giao trễ 2 ngày'
              : i === 1
                ? 'Sản phẩm không đúng mô tả hình ảnh, yêu cầu trả hàng'
                : 'Khách khiếu nại chưa nhận được hàng nhưng đơn báo đã giao',
          lastMessage:
            lastMsg?.content ||
            'Em gửi kèm ảnh chụp gói hàng bị móp góc, nhờ bên Sàn kiểm tra giúp em với ạ.',
          lastMessageTime:
            lastMsg?.createdAt || new Date(Date.now() - (i + 1) * 3600000).toISOString(),
          lastMessageRole: lastMsg?.senderRole || 'BUYER',
          unreadCount: lastMsg?.senderRole === 'BUYER' ? 1 : 0,
        });
      }

      if (threads.length === 0) {
        return getFallbackSupportThreads();
      }

      return threads;
    } catch {
      return getFallbackSupportThreads();
    }
  },
};

function getFallbackSellerThreads(): ChatThreadItem[] {
  return [
    {
      id: 'conv_seller_01',
      conversationId: 'conv_seller_01',
      orderId: '8906082a-3e14-41f9-84ef-83d0909044ae',
      orderCode: 'ORD-20261112-000001',
      channelType: 'BUYER_SELLER',
      customerName: 'Tran Che Thien',
      customerPhone: '0963433678',
      orderStatus: 'IN_TRANSIT',
      totalAmount: 30001,
      productTitle: 'Mô hình LEGO Icons NASA Apollo 11 Lunar Lander',
      productQuantity: 1,
      lastMessage: 'Shop ơi, đơn này giao bên GHN bưu tá có gọi trước không vậy ạ?',
      lastMessageTime: new Date(Date.now() - 15 * 60000).toISOString(),
      lastMessageRole: 'BUYER',
      unreadCount: 1,
    },
    {
      id: 'conv_seller_02',
      conversationId: 'conv_seller_02',
      orderId: '5',
      orderCode: 'ord_01hqz555abc',
      channelType: 'BUYER_SELLER',
      customerName: 'Nguyen Van Buyer',
      customerPhone: '0912345678',
      orderStatus: 'PAID',
      totalAmount: 399990,
      productTitle: 'Nexus Pro Audio Wireless Earbuds',
      productQuantity: 1,
      lastMessage: 'Shop kiểm tra kỹ tem bảo hành trước khi gửi giúp mình nha.',
      lastMessageTime: new Date(Date.now() - 3 * 3600000).toISOString(),
      lastMessageRole: 'BUYER',
      unreadCount: 0,
    },
    {
      id: 'conv_seller_03',
      conversationId: 'conv_seller_03',
      orderId: '1',
      orderCode: 'NX-ORD-8021',
      channelType: 'BUYER_SELLER',
      customerName: 'Minh Anh',
      customerPhone: '0988776655',
      orderStatus: 'PROCESSING',
      totalAmount: 1290000,
      productTitle: 'Tai nghe không dây Nexus Air ANC',
      productQuantity: 1,
      lastMessage: 'Dạ vâng shop, em đã nhận được mã vận đơn GHN rồi ạ.',
      lastMessageTime: new Date(Date.now() - 24 * 3600000).toISOString(),
      lastMessageRole: 'BUYER',
      unreadCount: 0,
    },
  ];
}

function getFallbackSupportThreads(): ChatThreadItem[] {
  return [
    {
      id: 'conv_support_01',
      conversationId: 'conv_support_01',
      orderId: '8906082a-3e14-41f9-84ef-83d0909044ae',
      orderCode: 'ORD-20261112-000001',
      channelType: 'BUYER_SUPPORT',
      customerName: 'Tran Che Thien',
      customerPhone: '0963433678',
      orderStatus: 'IN_TRANSIT',
      totalAmount: 30001,
      productTitle: 'Mô hình LEGO Icons NASA Apollo 11 Lunar Lander',
      productQuantity: 1,
      supportCaseId: 'cs_ord001',
      priority: 'URGENT',
      slaMinutesRemaining: 38,
      disputeReason: 'Hàng bị nứt góc hộp khi mở kiện, yêu cầu hoàn tiền hoặc đổi mới',
      lastMessage: 'Em gửi kèm ảnh góc hộp bị móp rách, nhờ Nexus hỗ trợ trọng tài giúp em!',
      lastMessageTime: new Date(Date.now() - 10 * 60000).toISOString(),
      lastMessageRole: 'BUYER',
      unreadCount: 1,
    },
    {
      id: 'conv_support_02',
      conversationId: 'conv_support_02',
      orderId: '2',
      orderCode: 'NX-ORD-8017',
      channelType: 'BUYER_SUPPORT',
      customerName: 'Quốc Bảo',
      customerPhone: '0903112233',
      orderStatus: 'SHIPPED',
      totalAmount: 2450000,
      productTitle: 'Máy ảnh phim Retro 35mm Vintage',
      productQuantity: 1,
      supportCaseId: 'cs_ord8017',
      priority: 'HIGH',
      slaMinutesRemaining: 95,
      disputeReason: 'Bưu tá GHN báo phát không thành công 3 lần mà không gọi điện cho người mua',
      lastMessage: 'Mình ở nhà cả ngày nhưng bưu tá không gọi mà lại cập nhật không liên lạc được.',
      lastMessageTime: new Date(Date.now() - 90 * 60000).toISOString(),
      lastMessageRole: 'BUYER',
      unreadCount: 0,
    },
    {
      id: 'conv_support_03',
      conversationId: 'conv_support_03',
      orderId: '3',
      orderCode: 'NX-ORD-8009',
      channelType: 'BUYER_SUPPORT',
      customerName: 'Thu Hà',
      customerPhone: '0944556677',
      orderStatus: 'DELIVERED',
      totalAmount: 890000,
      productTitle: 'Đồng hồ thể thao S2 Smart Watch',
      productQuantity: 1,
      supportCaseId: 'cs_ord8009',
      priority: 'MEDIUM',
      slaMinutesRemaining: 150,
      disputeReason: 'Yêu cầu trả hàng hoàn tiền theo chính sách 7 ngày dùng thử miễn phí',
      lastMessage: 'Sản phẩm vẫn còn nguyên tem seal, em muốn trả hàng để lấy lại tiền cọc.',
      lastMessageTime: new Date(Date.now() - 3 * 3600000).toISOString(),
      lastMessageRole: 'BUYER',
      unreadCount: 0,
    },
  ];
}
