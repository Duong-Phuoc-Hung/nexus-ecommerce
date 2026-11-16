import { Conversation } from '../../domain/entities/Conversation';
import { ChatForbiddenException } from '../../domain/exceptions/ChatForbiddenException';
import { ConversationNotFoundException } from '../../domain/exceptions/ConversationNotFoundException';
import { IConversationRepository } from '../../domain/repositories/IConversationRepository';

export interface HandoverConversationInput {
  conversationId: string;
  userId: string;
}

export class HandoverConversationUseCase {
  private readonly pending = new Map<string, Promise<Conversation>>();

  constructor(private readonly conversations: IConversationRepository) {}

  public async execute(
    input: HandoverConversationInput,
    actorId: string,
    role: string,
  ): Promise<Conversation> {
    if (role.toUpperCase() !== 'BUYER' || input.userId !== actorId) {
      throw new ChatForbiddenException('Chỉ Buyer được yêu cầu CSKH cho hội thoại của chính mình.');
    }

    const previous = this.pending.get(input.conversationId) ?? Promise.resolve();
    const run = async () => {
      const conversation = await this.conversations.findById(input.conversationId);
      if (!conversation) throw new ConversationNotFoundException(input.conversationId);
      if (conversation.buyerId !== actorId) {
        throw new ChatForbiddenException('Bạn không có quyền bàn giao hội thoại này.');
      }
      const next = new Conversation(conversation.toDto());
      if (next.requestHumanHandover()) await this.conversations.update(next);
      return next;
    };
    const current = previous.then(run, run);
    this.pending.set(input.conversationId, current);
    try {
      return await current;
    } finally {
      if (this.pending.get(input.conversationId) === current)
        this.pending.delete(input.conversationId);
    }
  }
}
