import { ChatMessage } from '../entities/ChatMessage';

export interface IChatMessageRepository {
  findById(id: string): Promise<ChatMessage | null>;
  findByConversationId(
    conversationId: string,
    limit?: number,
    after?: Date,
    beforeSeq?: number,
    afterSeq?: number,
  ): Promise<ChatMessage[]>;
  findByClientMessageId(
    conversationId: string,
    clientMessageId: string,
  ): Promise<ChatMessage | null>;
  getNextSeq(conversationId: string): Promise<number>;
  save(message: ChatMessage): Promise<void>;
}
