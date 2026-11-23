export type ChannelType = 'AI_BOT' | 'BUYER_SELLER' | 'BUYER_SUPPORT';

export type MessageSenderRole = 'BUYER' | 'SELLER' | 'SUPPORT_STAFF' | 'AI' | 'SYSTEM';

export interface ChatAttachment {
  url: string;
  mimeType: string;
  filename?: string;
  sizeBytes?: number;
}

export interface ChatMessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: MessageSenderRole;
  seq?: number;
  clientMessageId?: string;
  content: string;
  attachments?: ChatAttachment[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ConversationDto {
  id: string;
  orderId: string;
  channelType: ChannelType;
  buyerId: string;
  sellerId: string;
  supportCaseId?: string;
  status: string;
  lastSeq?: number;
  buyerLastReadSeq?: number;
  counterpartLastReadSeq?: number;
  myLastReadSeq?: number;
  unreadCount?: number;
  lastMessage?: string | null;
  lastMessageRole?: MessageSenderRole | null;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatThreadItem {
  id: string;
  conversationId: string;
  orderId: string;
  orderCode: string;
  channelType: ChannelType;
  sellerId?: string;
  counterpartLabel?: string;
  customerName: string;
  customerAvatar?: string;
  customerPhone?: string;
  orderStatus: string;
  totalAmount: number;
  productTitle: string;
  productImage?: string | null;
  productQuantity: number;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageRole?: MessageSenderRole;
  lastSeq?: number;
  myLastReadSeq?: number;
  unreadCount: number;
  supportCaseId?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  slaMinutesRemaining?: number;
  disputeReason?: string;
}

export interface SendMessagePayload {
  content: string;
  clientMessageId?: string;
  attachments?: ChatAttachment[];
}

export interface OpenConversationPayload {
  orderId: string;
  channelType: ChannelType;
  sellerId?: string;
  buyerId?: string;
}

export interface EscalateDisputePayload {
  orderId: string;
  orderCode?: string;
  reason: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  attachments?: ChatAttachment[];
  idempotencyKey?: string;
}
