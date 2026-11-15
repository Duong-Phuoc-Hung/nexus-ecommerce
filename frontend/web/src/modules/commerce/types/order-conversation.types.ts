export type ConversationChannel = 'SELLER' | 'SUPPORT';

export type ConversationState = 'OPEN' | 'WAITING' | 'ASSIGNED' | 'CLOSED';

export type MessageAuthorRole = 'BUYER' | 'SELLER' | 'SUPPORT_STAFF' | 'AI';

export type AssistIntent = 'TRACK_SHIPMENT' | 'POLICY_FAQ' | 'DRAFT_COMPLAINT';

export type ComplaintCaseType = 'DAMAGED_ITEM' | 'WRONG_ITEM' | 'DELIVERY_ISSUE' | 'OTHER';

export interface ConversationAttachment {
  attachmentId: string;
  fileName: string;
  mimeType: string;
  size: number;
  previewUrl: string;
  uploadedAt: string;
}

export interface OrderMessage {
  conversationId: string;
  seq: number;
  authorId: string;
  authorName?: string;
  authorRole: MessageAuthorRole;
  clientMessageId: string;
  body: string;
  attachments?: ConversationAttachment[];
  aiMetadata?: {
    intent?: AssistIntent;
    carrier?: string;
    shipmentStatus?: string;
    trackingCode?: string;
    updatedAt?: string;
    estimatedDeliveryAt?: string | null;
    policySources?: string[];
    suggestHumanHandoff?: boolean;
    draftComplaint?: {
      type: ComplaintCaseType;
      description: string;
    };
  };
  createdAt: string;
  /** Trạng thái chỉ tồn tại ở client khi gửi tin đang chờ hoặc thất bại */
  deliveryStatus?: 'sending' | 'sent' | 'failed';
  deliveryError?: string;
}

export interface OrderConversationCaseSummary {
  caseId: string;
  orderId: string;
  conversationId: string;
  type: ComplaintCaseType;
  status: 'OPEN' | 'INVESTIGATING' | 'ESCALATED_DISPUTE' | 'RESOLVED' | 'REJECTED';
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
  }>;
  description: string;
  contactPhone: string;
  attachmentIds: string[];
  resolutionSummary?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface OrderConversation {
  id: string;
  orderId: string;
  buyerId: string;
  channel: ConversationChannel;
  recipientKey: string;
  recipientLabel: string;
  assigneeId: string | null;
  assigneeName: string | null;
  state: ConversationState;
  topic?: string;
  lastSeq: number;
  buyerLastReadSeq: number;
  counterpartLastReadSeq: number;
  linkedCases?: OrderConversationCaseSummary[];
  resolutionConclusion?: string;
  closedAt?: string | null;
  ClosedByRole?: string | null;
  updatedAt: string;
  /** Đánh dấu dữ liệu đang lấy từ API thật hay bộ mô phỏng local khi BE chưa mount route */
  sourceMode?: 'LIVE_API' | 'LOCAL_SIMULATION';
}

export interface OpenOrderConversationInput {
  orderId: string;
  channel: ConversationChannel;
  sellerId?: string;
  sellerName?: string;
  requestHuman?: boolean;
}

export interface SendOrderMessageInput {
  conversationId: string;
  clientMessageId: string;
  text: string;
  attachmentIds?: string[];
}

export interface AssistOrderConversationInput {
  conversationId: string;
  clientMessageId: string;
  intent: AssistIntent;
  question: string;
}

export interface HandoffOrderConversationInput {
  conversationId: string;
  topic: string;
  sharedFromSellerConversationId?: string;
  sharedMessages?: Array<{
    seq: number;
    authorRole: MessageAuthorRole;
    body: string;
    createdAt: string;
  }>;
}

export interface CreateConversationCaseInput {
  conversationId: string;
  idempotencyKey: string;
  type: ComplaintCaseType;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
  }>;
  description: string;
  contactPhone: string;
  attachmentIds: string[];
}
