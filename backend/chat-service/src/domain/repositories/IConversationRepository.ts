import { Conversation, ChannelType } from '../entities/Conversation';

export interface IConversationRepository {
  findById(id: string): Promise<Conversation | null>;
  findByOrderAndChannel(orderId: string, channelType: ChannelType): Promise<Conversation | null>;
  findByOrderId(orderId: string): Promise<Conversation[]>;
  findWaitingForStaff(limit: number): Promise<Conversation[]>;
  save(conversation: Conversation): Promise<void>;
  update(conversation: Conversation): Promise<void>;
}
