import { Conversation, ChannelType } from '../entities/Conversation';

export interface IConversationRepository {
  findAccessible(userId: string, role: string): Promise<Conversation[]>;
  findById(id: string): Promise<Conversation | null>;
  findByOrderAndChannel(orderId: string, channelType: ChannelType): Promise<Conversation | null>;
  findByOrderId(orderId: string): Promise<Conversation[]>;
  findWaitingForStaff(limit: number): Promise<Conversation[]>;
  save(conversation: Conversation): Promise<void>;
  update(conversation: Conversation): Promise<void>;
  markUserRead(conversationId: string, userId: string, lastReadSeq: number): Promise<number>;
  getUnreadCount(conversationId: string, userId: string): Promise<number>;
  getReadSummary(
    conversationId: string,
    userId: string,
    buyerId: string,
  ): Promise<{
    lastSeq: number;
    myLastReadSeq: number;
    buyerLastReadSeq: number;
    counterpartLastReadSeq: number;
    unreadCount: number;
  }>;
}
