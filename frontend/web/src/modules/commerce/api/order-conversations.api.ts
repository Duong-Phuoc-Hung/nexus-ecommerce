import { requestApi } from '@/lib/axios/api-client';
import { ApiError, unwrap, type RequestApi } from '@/lib/axios/http';
import type {
  BackendChannelType,
  BackendChatMessageDto,
  BackendConversationDto,
  DamageAssessmentVerdict,
} from '@/modules/chat/api/buyer-assistant.api';
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

export function isSimulationModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('sim') === '1';
  } catch {
    return false;
  }
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

function toBackendChannelType(channel: ConversationChannel): BackendChannelType {
  return channel === 'SELLER' ? 'BUYER_SELLER' : 'BUYER_SUPPORT';
}

function mapConversationDto(
  dto: BackendConversationDto,
  channel: ConversationChannel,
  recipientLabel: string,
): OrderConversation {
  const statusUpper = (dto.status || 'ACTIVE').toUpperCase();
  const state =
    statusUpper === 'CLOSED' || statusUpper === 'RESOLVED'
      ? 'CLOSED'
      : statusUpper === 'WAITING' || statusUpper === 'WAITING_STAFF'
        ? 'WAITING'
        : statusUpper === 'ASSIGNED' || statusUpper === 'STAFF_ASSIGNED'
          ? 'ASSIGNED'
          : 'OPEN';

  return {
    id: dto.id,
    orderId: String(dto.orderId),
    buyerId: dto.buyerId,
    channel,
    recipientKey: channel === 'SELLER' ? dto.sellerId : 'SUPPORT',
    recipientLabel,
    assigneeId: null,
    assigneeName: null,
    state,
    lastSeq: 0,
    buyerLastReadSeq: 0,
    counterpartLastReadSeq: 0,
    linkedCases: dto.supportCaseId
      ? [
          {
            caseId: dto.supportCaseId,
            orderId: String(dto.orderId),
            conversationId: dto.id,
            type: 'OTHER',
            status: 'OPEN',
            items: [],
            description: '',
            contactPhone: '',
            attachmentIds: [],
            createdAt: dto.updatedAt || dto.createdAt,
          },
        ]
      : [],
    updatedAt: dto.updatedAt || dto.createdAt,
    sourceMode: 'LIVE_API',
  };
}

function mapChatMessageDto(
  dto: BackendChatMessageDto,
  indexSeq: number,
  sellerLabel: string,
): OrderMessage {
  const role =
    dto.senderRole === 'SYSTEM'
      ? 'AI'
      : dto.senderRole === 'SELLER' || dto.senderRole === 'SUPPORT_STAFF' || dto.senderRole === 'AI'
        ? dto.senderRole
        : 'BUYER';

  const authorName =
    role === 'BUYER'
      ? 'Bạn'
      : role === 'SELLER'
        ? sellerLabel
        : role === 'SUPPORT_STAFF'
          ? 'Nhân viên hỗ trợ'
          : 'Trợ lý Nexus';

  return {
    conversationId: dto.conversationId,
    seq: typeof dto.seq === 'number' && dto.seq > 0 ? dto.seq : indexSeq,
    authorId: dto.senderId,
    authorName,
    authorRole: role,
    clientMessageId: dto.id,
    body: dto.content,
    attachments: dto.attachments?.map((att, idx) => ({
      attachmentId: `${dto.id}_att_${idx}`,
      fileName: att.filename || `Tệp đính kèm ${idx + 1}`,
      mimeType: att.mimeType,
      size: att.sizeBytes || 0,
      previewUrl: att.url,
      uploadedAt: dto.createdAt,
    })),
    createdAt: dto.createdAt,
    deliveryStatus: 'sent',
  };
}

export interface ReadOnlyOrderShipmentSnapshot {
  hasShipment: boolean;
  interrupted?: boolean;
  carrier?: string;
  trackingCode?: string;
  status?: string;
  statusLabel?: string;
  currentLocation?: string;
  updatedAt?: string;
  estimatedDeliveryAt?: string | null;
}

/**
 * Đọc trạng thái vận đơn ở chế độ chỉ đọc (Read-Only).
 * Tuyệt đối không tạo vận đơn thử nghiệm hoặc tự bịa hãng/vị trí/ETA khi thiếu dữ liệu.
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

  if (['PENDING', 'PENDING_PAYMENT', 'CREATED', 'PLACED'].includes(orderStatus) && !rawTracking) {
    return { hasShipment: false };
  }

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
    }>(`/fulfillments/shipments/by-order/${encodeURIComponent(order.id)}?readOnly=true`, {
      signal,
    });
    const data = unwrap<{
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

    if (data && (data.trackingCode || data.status || data.statusCode)) {
      return {
        hasShipment: true,
        carrier: data.carrier || data.carrierCode || undefined,
        trackingCode: data.trackingCode || rawTracking || undefined,
        status: data.statusCode || data.status,
        statusLabel: formatShipmentStatusVi(data.statusCode || data.status || ''),
        currentLocation: data.currentLocation || undefined,
        updatedAt: data.updatedAt || data.updated || undefined,
        estimatedDeliveryAt: data.estimatedDeliveryAt ?? null,
      };
    }

    return { hasShipment: false };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      if (orderStatus === 'SHIPPED' || orderStatus === 'DELIVERED' || Boolean(rawTracking)) {
        return {
          hasShipment: true,
          trackingCode: rawTracking || undefined,
          status: orderStatus,
          statusLabel:
            orderStatus === 'DELIVERED'
              ? 'Đã giao hàng thành công'
              : orderStatus === 'SHIPPED'
                ? 'Đang trên đường giao hàng'
                : 'Đã có mã vận đơn',
          estimatedDeliveryAt: null,
        };
      }
      return { hasShipment: false };
    }

    return {
      hasShipment: false,
      interrupted: true,
    };
  }
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
      return 'Kiện hàng đang hoàn về kho Người bán';
    default:
      return status || 'Đang cập nhật hành trình';
  }
}

// Kho tạm chứa tệp đính kèm vừa nén ở client để đính trực tiếp vào POST /chat/conversations/:id/messages & POST /chat/escalate
const attachmentBuffer = new Map<string, ConversationAttachment>();

async function fileToCompactAttachmentUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Không đọc được tệp đã chọn.'));
      reader.readAsDataURL(file);
    });
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        const maxSide = 960;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Không đọc được ảnh đã chọn.'));
    reader.readAsDataURL(file);
  });
}

export function createOrderConversationsApi(request: RequestApi) {
  return {
    /**
     * 1. POST /api/v1/chat/conversations
     * Mở hoặc lấy phòng hội thoại chung ID với BE Chat Service (BUYER_SELLER / BUYER_SUPPORT)
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
          : 'Bộ phận Hỗ trợ Nexus';

      try {
        const raw = await request<{ success: boolean; data: BackendConversationDto }>(
          '/chat/conversations',
          {
            method: 'POST',
            body: {
              orderId: String(input.orderId),
              channelType: toBackendChannelType(input.channel),
              sellerId: input.channel === 'SELLER' ? recipientKey : order.sellerId || undefined,
            },
          },
        );
        const dto = unwrap<BackendConversationDto>(raw);
        const conversation = mapConversationDto(dto, input.channel, recipientLabel);

        const listResult = await this.listMessages(conversation.id, {
          limit: 50,
          recipientLabel,
        });
        if (listResult.meta) {
          conversation.lastSeq = listResult.meta.lastSeq;
          conversation.buyerLastReadSeq = listResult.meta.buyerLastReadSeq;
          conversation.counterpartLastReadSeq = listResult.meta.counterpartLastReadSeq;
        } else {
          conversation.lastSeq = listResult.items.reduce((acc, m) => Math.max(acc, m.seq), 0);
        }

        return {
          conversation,
          messages: listResult.items,
        };
      } catch (err) {
        if (!isSimulationModeEnabled()) throw err;

        const store = readLocalStore();
        const key = makeThreadKey(input.orderId, buyerId, input.channel, recipientKey);
        const existing = store[key];
        if (existing) {
          return {
            conversation: existing.conversation,
            messages: existing.messages,
          };
        }

        const now = new Date().toISOString();
        const convId = generateClientUuid();
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
          lastSeq: 0,
          buyerLastReadSeq: 0,
          counterpartLastReadSeq: 0,
          linkedCases: [],
          updatedAt: now,
          sourceMode: 'LOCAL_SIMULATION',
        };

        store[key] = {
          conversation,
          messages: [],
          idempotentCases: {},
          attachments: {},
        };
        writeLocalStore(store);

        return {
          conversation,
          messages: [],
        };
      }
    },

    /**
     * 2. GET /api/v1/chat/conversations/:id/messages
     */
    async listMessages(
      conversationId: string,
      options?: {
        after?: number;
        before?: number;
        limit?: number;
        recipientLabel?: string;
        signal?: AbortSignal;
      },
    ): Promise<{
      items: OrderMessage[];
      conversation: OrderConversation | null;
      hasOlder: boolean;
      meta?: {
        lastSeq: number;
        buyerLastReadSeq: number;
        counterpartLastReadSeq: number;
      };
    }> {
      const params = new URLSearchParams();
      if (options?.limit !== undefined) params.set('limit', String(options.limit));
      if (options?.before !== undefined) params.set('before', String(options.before));
      if (options?.after !== undefined) params.set('afterSeq', String(options.after));
      const qs = params.toString();

      try {
        const raw = await request<{
          success: boolean;
          data: BackendChatMessageDto[];
          meta?: {
            conversationId?: string;
            lastSeq?: number;
            buyerLastReadSeq?: number;
            counterpartLastReadSeq?: number;
            hasOlder?: boolean;
          };
        }>(
          `/chat/conversations/${encodeURIComponent(conversationId)}/messages${qs ? `?${qs}` : ''}`,
          {
            signal: options?.signal,
          },
        );
        const list = unwrap<BackendChatMessageDto[]>(raw);
        const safeList = Array.isArray(list) ? list : [];
        const mapped = safeList.map((item, idx) =>
          mapChatMessageDto(item, idx + 1, options?.recipientLabel || 'Người bán'),
        );
        const metaObj =
          raw &&
          typeof raw === 'object' &&
          'meta' in raw &&
          raw.meta &&
          typeof raw.meta === 'object'
            ? raw.meta
            : undefined;

        return {
          items: mapped,
          conversation: null,
          hasOlder: Boolean(metaObj?.hasOlder),
          meta: metaObj
            ? {
                lastSeq: Number(metaObj.lastSeq ?? 0),
                buyerLastReadSeq: Number(metaObj.buyerLastReadSeq ?? 0),
                counterpartLastReadSeq: Number(metaObj.counterpartLastReadSeq ?? 0),
              }
            : undefined,
        };
      } catch (err) {
        if (!isSimulationModeEnabled()) throw err;

        const store = readLocalStore();
        const bundle = Object.values(store).find((b) => b.conversation.id === conversationId);
        if (!bundle) {
          throw new ApiError('Không tìm thấy hội thoại.', 404, 'CONVERSATION_NOT_FOUND');
        }
        return {
          items: [...bundle.messages].sort((a, b) => a.seq - b.seq),
          conversation: bundle.conversation,
          hasOlder: false,
        };
      }
    },

    /**
     * 3. POST /api/v1/chat/conversations/:id/messages
     * Khi lỗi mạng/server, ném lỗi thật để giữ nguyên bản nháp + nút "Gửi lại".
     */
    async sendMessage(
      buyerId: string,
      buyerName: string,
      input: SendOrderMessageInput,
      options?: {
        simulateNetworkFailure?: boolean;
        recipientLabel?: string;
        currentSeq?: number;
      },
    ): Promise<{ message: OrderMessage; conversation?: OrderConversation }> {
      const body = input.text.trim();
      const charCount = [...body].length;
      if (!body || charCount > 4000) {
        throw new ApiError(
          'Nội dung tin nhắn không hợp lệ (từ 1 đến 4000 ký tự).',
          422,
          'INVALID_MESSAGE_BODY',
        );
      }

      if (options?.simulateNetworkFailure) {
        throw new ApiError(
          'Kết nối mạng bị gián đoạn khi gửi tin. Vui lòng bấm "Gửi lại".',
          503,
          'NETWORK_SEND_FAILED',
        );
      }

      const attachmentsPayload = (input.attachmentIds || [])
        .map((id) => attachmentBuffer.get(id))
        .filter((att): att is ConversationAttachment => Boolean(att))
        .map((att) => ({
          url: att.previewUrl,
          mimeType: att.mimeType,
          filename: att.fileName,
          sizeBytes: att.size,
        }));

      try {
        const raw = await request<{
          success: boolean;
          data: { message: BackendChatMessageDto; reply?: BackendChatMessageDto | null };
        }>(`/chat/conversations/${encodeURIComponent(input.conversationId)}/messages`, {
          method: 'POST',
          body: {
            content: body,
            clientMessageId: input.clientMessageId,
            attachments: attachmentsPayload.length > 0 ? attachmentsPayload : undefined,
          },
        });
        const unwrapped = unwrap<{
          message: BackendChatMessageDto;
          reply?: BackendChatMessageDto | null;
        }>(raw);

        const mapped = mapChatMessageDto(
          unwrapped.message,
          (options?.currentSeq || 0) + 1,
          options?.recipientLabel || 'Người bán',
        );
        mapped.clientMessageId = input.clientMessageId;

        return {
          message: mapped,
        };
      } catch (err) {
        if (!isSimulationModeEnabled()) {
          throw err;
        }

        const store = readLocalStore();
        const bundle = Object.values(store).find((b) => b.conversation.id === input.conversationId);
        if (!bundle || bundle.conversation.buyerId !== buyerId) {
          throw new ApiError('Không tìm thấy hội thoại.', 404, 'CONVERSATION_NOT_FOUND');
        }

        const prior = bundle.messages.find(
          (m) => m.authorId === buyerId && m.clientMessageId === input.clientMessageId,
        );
        if (prior) {
          return { message: prior, conversation: bundle.conversation };
        }

        const nextSeq = bundle.conversation.lastSeq + 1;
        const resolvedAttachments = (input.attachmentIds || [])
          .map((id) => attachmentBuffer.get(id) || bundle.attachments[id])
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
     * 4. PUT /api/v1/chat/conversations/:id/read
     */
    async markAsRead(conversationId: string, lastReadSeq: number): Promise<void> {
      try {
        await request(`/chat/conversations/${encodeURIComponent(conversationId)}/read`, {
          method: 'PUT',
          body: { lastReadSeq },
        });
      } catch {
        if (!isSimulationModeEnabled()) return;
        const store = readLocalStore();
        const bundle = Object.values(store).find((b) => b.conversation.id === conversationId);
        if (bundle && lastReadSeq > bundle.conversation.buyerLastReadSeq) {
          bundle.conversation.buyerLastReadSeq = lastReadSeq;
          writeLocalStore(store);
        }
      }
    },

    /**
     * Gửi tin tóm tắt bàn giao sang luồng Support khi chuyển kênh hoặc yêu cầu gặp nhân viên thật.
     * Nếu đơn đang có phòng AI_BOT mở, gọi thêm POST /chat/handover để đưa vào hàng chờ WAITING_STAFF.
     */
    async requestHumanHandoff(
      buyerId: string,
      buyerName: string,
      input: HandoffOrderConversationInput & { orderId?: string },
    ): Promise<{ conversation: OrderConversation | null; systemMessage: OrderMessage }> {
      const sharedLines = (input.sharedMessages || []).map(
        (m) => `• [${m.authorRole === 'BUYER' ? 'Buyer' : 'Seller'}]: ${m.body}`,
      );
      const summaryContent =
        `[Yêu cầu gặp nhân viên hỗ trợ — ${input.topic}]` +
        (sharedLines.length > 0 ? `\n${sharedLines.join('\n')}` : '');

      const sent = await this.sendMessage(buyerId, buyerName, {
        conversationId: input.conversationId,
        clientMessageId: generateClientUuid(),
        text: summaryContent,
      });

      if (input.orderId) {
        try {
          const convRaw = await request<{ success: boolean; data: BackendConversationDto[] }>(
            `/chat/orders/${encodeURIComponent(input.orderId)}/conversations`,
          );
          const convs = unwrap<BackendConversationDto[]>(convRaw);
          const aiRoom = Array.isArray(convs)
            ? convs.find(
                (c) =>
                  c.channelType === 'AI_BOT' &&
                  ['BOT_ACTIVE', 'ACTIVE', 'OPEN'].includes((c.status || '').toUpperCase()),
              )
            : undefined;
          if (aiRoom) {
            await request('/chat/handover', {
              method: 'POST',
              body: { conversationId: aiRoom.id, userId: buyerId },
            });
          }
        } catch {
          // Bỏ qua nếu chưa có phòng AI_BOT hoặc handover không khả dụng
        }
      }

      return {
        conversation: sent.conversation || null,
        systemMessage: sent.message,
      };
    },

    /**
     * 5. POST /api/v1/chat/conversations/:id/attachments
     * Hỗ trợ JPG, PNG, WEBP, PDF, MP4 <= 20MB theo BE chat-service.
     */
    async uploadAttachment(conversationId: string, file: File): Promise<ConversationAttachment> {
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
        'video/mp4',
      ];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        throw new ApiError(
          `Định dạng "${file.name}" không được hỗ trợ. Chỉ chấp nhận ảnh JPG, PNG, WEBP, PDF hoặc video MP4.`,
          422,
          'INVALID_ATTACHMENT_TYPE',
        );
      }
      const maxBytes = 20 * 1024 * 1024;
      if (file.size > maxBytes) {
        throw new ApiError(
          `Tệp "${file.name}" vượt quá giới hạn 20MB.`,
          422,
          'ATTACHMENT_TOO_LARGE',
        );
      }

      const compactUrl = await fileToCompactAttachmentUrl(file);
      const dataBase64 = compactUrl.includes('base64,')
        ? compactUrl.split('base64,')[1]
        : undefined;

      try {
        const raw = await request<{
          success: boolean;
          data: {
            attachmentId: string;
            url: string;
            mimeType: string;
            filename: string;
            sizeBytes: number;
          };
        }>(`/chat/conversations/${encodeURIComponent(conversationId)}/attachments`, {
          method: 'POST',
          body: {
            filename: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            url: compactUrl,
            dataBase64,
          },
        });
        const uploaded = unwrap<{
          attachmentId: string;
          url: string;
          mimeType: string;
          filename: string;
          sizeBytes: number;
        }>(raw);

        const attachment: ConversationAttachment = {
          attachmentId: uploaded.attachmentId,
          fileName: uploaded.filename || file.name,
          mimeType: uploaded.mimeType || file.type,
          size: uploaded.sizeBytes || file.size,
          previewUrl: uploaded.url || compactUrl,
          uploadedAt: new Date().toISOString(),
        };
        attachmentBuffer.set(attachment.attachmentId, attachment);
        return attachment;
      } catch (err) {
        if (!isSimulationModeEnabled()) throw err;

        const attachment: ConversationAttachment = {
          attachmentId: `att_${generateClientUuid().slice(0, 8)}`,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          previewUrl: compactUrl,
          uploadedAt: new Date().toISOString(),
        };
        attachmentBuffer.set(attachment.attachmentId, attachment);
        const store = readLocalStore();
        const bundle = Object.values(store).find((b) => b.conversation.id === conversationId);
        if (bundle) {
          bundle.attachments[attachment.attachmentId] = attachment;
          writeLocalStore(store);
        }
        return attachment;
      }
    },

    /**
     * 6. POST /api/v1/chat/assess-image
     * Gọi AI thẩm định ảnh bằng chứng hư hỏng / sai hàng (<= 5MB JPEG/PNG/WEBP)
     */
    async assessDamageImage(
      file: File,
      expectedItem?: string,
    ): Promise<DamageAssessmentVerdict | null> {
      const supported = ['image/jpeg', 'image/png', 'image/webp'];
      if (!supported.includes(file.type.toLowerCase()) || file.size > 5 * 1024 * 1024) {
        return null;
      }
      try {
        const compactUrl = await fileToCompactAttachmentUrl(file);
        const idx = compactUrl.indexOf('base64,');
        if (idx < 0) return null;
        const imageBase64 = compactUrl.slice(idx + 7);
        const raw = await request<{ success: boolean; data: DamageAssessmentVerdict }>(
          '/chat/assess-image',
          {
            method: 'POST',
            body: {
              imageBase64,
              mimeType: file.type.toLowerCase(),
              expectedItem: expectedItem?.slice(0, 1000),
            },
          },
        );
        return unwrap<DamageAssessmentVerdict>(raw);
      } catch {
        return null;
      }
    },

    /**
     * 4. Gửi hồ sơ Báo hàng vỡ / Khiếu nại / Trả hàng trực tiếp tới Fulfillment (`POST /api/v1/support/cases`)
     * Chỉ trả thành công khi Fulfillment xác nhận HTTP 201 và cấp mã hồ sơ (`id`) thật.
     * Nếu lỗi mạng hoặc server từ chối, ném lỗi để FE giữ nguyên nháp + Idempotency-Key cho phép thử lại.
     */
    async createCaseFromConversation(
      buyerId: string,
      buyerName: string,
      input: CreateConversationCaseInput & {
        aiVerdict?: DamageAssessmentVerdict | null;
        sharedMessages?: string[];
        orderStatus?: string;
      },
      orderId?: string,
    ): Promise<{
      caseSummary: OrderConversationCaseSummary;
      conversation: OrderConversation | null;
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
          'Vui lòng chọn ít nhất 1 sản phẩm trong đơn hàng.',
          422,
          'MISSING_CASE_ITEMS',
        );
      }

      const attachmentsPayload = input.attachmentIds
        .map((id) => attachmentBuffer.get(id))
        .filter((att): att is ConversationAttachment => Boolean(att))
        .map((att) => ({
          url: att.previewUrl,
          mimeType: att.mimeType,
          filename: att.fileName,
          sizeBytes: att.size,
        }));

      const photos = attachmentsPayload
        .filter((a) => a.mimeType.startsWith('image/'))
        .map((a) => a.url);
      const videos = attachmentsPayload
        .filter((a) => a.mimeType.startsWith('video/'))
        .map((a) => a.url);

      const itemSummary = input.items.map((it) => `${it.productName} (x${it.quantity})`).join(', ');
      const fullReason = `[${formatCaseTypeLabel(input.type)}] ${cleanDesc}\nSản phẩm: ${itemSummary}\nSĐT liên hệ: ${input.contactPhone}`;
      const priority =
        input.type === 'DAMAGED_ITEM' || input.type === 'WRONG_ITEM' ? 'Cao' : 'Trung bình';
      const resolvedOrderId = (orderId || '').trim();

      try {
        const raw = await request<{
          success: boolean;
          message?: string;
          data: {
            id?: string;
            caseId?: string;
            orderId?: string;
            orderCode?: string;
            status?: string;
          };
        }>('/support/cases', {
          method: 'POST',
          headers: {
            'Idempotency-Key': input.idempotencyKey,
          },
          body: {
            orderId: resolvedOrderId,
            orderCode: resolvedOrderId,
            customer: buyerName || 'Khách hàng Nexus',
            userId: buyerId,
            type: formatCaseTypeLabel(input.type),
            reason: fullReason,
            priority,
            idempotencyKey: input.idempotencyKey,
            aiVerdict: input.aiVerdict || undefined,
            sharedMessages: input.sharedMessages,
            buyerEvidence: {
              photos: photos.length > 0 ? photos : undefined,
              videos: videos.length > 0 ? videos : undefined,
              aiVerdict: input.aiVerdict || undefined,
              note: fullReason,
              submittedAt: new Date().toISOString(),
            },
          },
        });

        const resData = unwrap<{
          id?: string;
          caseId?: string;
          orderId?: string;
          status?: string;
        }>(raw);

        const realCaseId = resData?.id || resData?.caseId;
        if (!realCaseId) {
          throw new ApiError(
            'Hệ thống Hỗ trợ chưa trả mã hồ sơ xác nhận. Vui lòng thử gửi lại.',
            502,
            'MISSING_SUPPORT_CASE_ID',
          );
        }

        // Nếu Buyer gửi Yêu cầu trả hàng / hoàn tiền trên đơn đã giao, gọi thêm Commerce requestRefund
        if (
          input.type === 'OTHER' &&
          resolvedOrderId &&
          (input.orderStatus || '').toUpperCase() === 'DELIVERED'
        ) {
          try {
            await request(`/orders/${encodeURIComponent(resolvedOrderId)}/refund/request`, {
              method: 'POST',
              body: {
                reason: fullReason,
                evidenceUrls: [...photos, ...videos],
              },
            });
          } catch {
            // Không chặn kết quả đã lưu Support Case thành công trên Fulfillment
          }
        }

        const now = new Date().toISOString();
        const caseSummary: OrderConversationCaseSummary = {
          caseId: realCaseId,
          orderId: String(resData.orderId || resolvedOrderId),
          conversationId: input.conversationId,
          type: input.type,
          status: 'OPEN',
          items: input.items,
          description: cleanDesc,
          contactPhone: input.contactPhone,
          attachmentIds: input.attachmentIds,
          createdAt: now,
        };

        // Ghi nhận tin nhắn tóm tắt vào hội thoại BUYER_SUPPORT với đúng mã hồ sơ Fulfillment vừa cấp
        let confirmationMessage: OrderMessage = {
          conversationId: input.conversationId,
          seq: Date.now(),
          authorId: buyerId,
          authorName: buyerName,
          authorRole: 'BUYER',
          clientMessageId: input.idempotencyKey,
          body: `[Đã tạo hồ sơ ${realCaseId}] ${formatCaseTypeLabel(input.type)} — ${cleanDesc}`,
          createdAt: now,
          deliveryStatus: 'sent',
        };

        if (input.conversationId) {
          try {
            const sent = await this.sendMessage(buyerId, buyerName, {
              conversationId: input.conversationId,
              clientMessageId: input.idempotencyKey,
              text: `[Hồ sơ #${realCaseId}] ${formatCaseTypeLabel(input.type)}\n• Sản phẩm: ${itemSummary}\n• Mô tả: ${cleanDesc}\n• SĐT liên hệ: ${input.contactPhone}`,
              attachmentIds: input.attachmentIds,
            });
            confirmationMessage = sent.message;
          } catch {
            // Không chặn kết quả đã tạo case thành công trên Fulfillment
          }
        }

        return {
          caseSummary,
          conversation: null,
          confirmationMessage,
        };
      } catch (err) {
        if (!isSimulationModeEnabled()) throw err;

        const store = readLocalStore();
        const bundle = Object.values(store).find((b) => b.conversation.id === input.conversationId);
        if (!bundle) {
          throw new ApiError('Không tìm thấy hội thoại.', 404, 'CONVERSATION_NOT_FOUND');
        }

        const existingCase = bundle.idempotentCases[input.idempotencyKey];
        if (existingCase) {
          return {
            caseSummary: existingCase,
            conversation: { ...bundle.conversation },
            confirmationMessage: bundle.messages[bundle.messages.length - 1],
          };
        }

        const now = new Date().toISOString();
        const caseId = `cs_${Date.now().toString(36)}`;
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
        bundle.conversation.state = 'WAITING';
        const nextSeq = bundle.conversation.lastSeq + 1;
        const confirmationMessage: OrderMessage = {
          conversationId: bundle.conversation.id,
          seq: nextSeq,
          authorId: buyerId,
          authorName: buyerName,
          authorRole: 'BUYER',
          clientMessageId: input.idempotencyKey,
          body: `[Hồ sơ #${caseId}] ${formatCaseTypeLabel(input.type)}: ${cleanDesc}`,
          createdAt: now,
          deliveryStatus: 'sent',
        };
        bundle.conversation.lastSeq = nextSeq;
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
     * Chỉ dùng khi bật ?sim=1 cho QA local
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
        throw new ApiError('Chỉ hỗ trợ mô phỏng khi bật ?sim=1.', 400, 'SIMULATION_DISABLED');
      }
      const now = new Date().toISOString();
      bundle.conversation.counterpartLastReadSeq = bundle.conversation.lastSeq;
      if (action === 'REOPEN_THREAD') {
        bundle.conversation.state = 'OPEN';
        bundle.conversation.closedAt = null;
      } else if (action === 'SELLER_REPLY') {
        const nextSeq = bundle.conversation.lastSeq + 1;
        bundle.messages.push({
          conversationId,
          seq: nextSeq,
          authorId: bundle.conversation.recipientKey,
          authorName: bundle.conversation.recipientLabel,
          authorRole: 'SELLER',
          clientMessageId: generateClientUuid(),
          body: `Shop đã ghi nhận thông tin đơn #${bundle.conversation.orderId} và sẽ kiểm tra ngay cho bạn.`,
          createdAt: now,
          deliveryStatus: 'sent',
        });
        bundle.conversation.lastSeq = nextSeq;
      } else if (action === 'SUPPORT_CLAIM_AND_REPLY') {
        bundle.conversation.state = 'ASSIGNED';
        bundle.conversation.assigneeName = 'Nhân viên hỗ trợ';
        const nextSeq = bundle.conversation.lastSeq + 1;
        bundle.messages.push({
          conversationId,
          seq: nextSeq,
          authorId: 'support_staff',
          authorName: 'Nhân viên hỗ trợ',
          authorRole: 'SUPPORT_STAFF',
          clientMessageId: generateClientUuid(),
          body: `Chào bạn, bộ phận Hỗ trợ Nexus đã tiếp nhận yêu cầu cho đơn #${bundle.conversation.orderId}.`,
          createdAt: now,
          deliveryStatus: 'sent',
        });
        bundle.conversation.lastSeq = nextSeq;
      } else if (action === 'RESOLVE_AND_CLOSE') {
        bundle.conversation.state = 'CLOSED';
      }
      bundle.conversation.updatedAt = now;
      writeLocalStore(store);
      return { conversation: { ...bundle.conversation }, messages: [...bundle.messages] };
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
      return 'Yêu cầu trả hàng / khiếu nại';
  }
}

export const orderConversationsApi = createOrderConversationsApi(requestApi);
