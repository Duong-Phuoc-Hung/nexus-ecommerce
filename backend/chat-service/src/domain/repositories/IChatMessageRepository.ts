import { ChatMessage } from '../entities/ChatMessage';

export interface IChatMessageRepository {
  findById(id: string): Promise<ChatMessage | null>;
  findByConversationId(
    conversationId: string,
    limit?: number,
    after?: Date,
  ): Promise<ChatMessage[]>;
  save(message: ChatMessage): Promise<void>;
}
