import { IChatMessageRepository } from '../../domain/repositories/IChatMessageRepository';
import { IConversationRepository } from '../../domain/repositories/IConversationRepository';
import { IPolicyRepository } from '../../domain/repositories/IPolicyRepository';
import { ChatMessage } from '../../domain/entities/ChatMessage';
import { SendMessageInput } from '../dtos/ChatDtos';
import { ConversationNotFoundException } from '../../domain/exceptions/ConversationNotFoundException';
import { ChatForbiddenException } from '../../domain/exceptions/ChatForbiddenException';
import { OrderTrackingTool } from '../tools/OrderTrackingTool';
import { ILanguageModelProvider } from '../ports/ILanguageModelProvider';
import { GeminiLlmProvider } from '../../infrastructure/ai/GeminiLlmProvider';

export class SendMessageUseCase {
  private readonly llmProvider: ILanguageModelProvider;

  constructor(
    private readonly messageRepo: IChatMessageRepository,
    private readonly conversationRepo: IConversationRepository,
    private readonly orderTrackingTool?: OrderTrackingTool,
    llmProvider?: ILanguageModelProvider,
    policyRepo?: IPolicyRepository,
  ) {
    this.llmProvider =
      llmProvider ||
      new GeminiLlmProvider({
        orderTrackingTool: this.orderTrackingTool,
        policyRepo,
      });
  }

  public async execute(
    input: SendMessageInput,
    currentUserId: string,
    currentUserRole?: string,
  ): Promise<{ message: ChatMessage; reply?: ChatMessage }> {
    const conv = await this.conversationRepo.findById(input.conversationId);
    if (!conv) {
      throw new ConversationNotFoundException(input.conversationId);
    }

    // 1. Kiểm soát phân quyền Anti-IDOR & Room Isolation
    if (!conv.canAccess(currentUserId, currentUserRole)) {
      throw new ChatForbiddenException('Bạn không có quyền gửi tin nhắn trong kênh hội thoại này.');
    }

    // 2. Lưu tin nhắn của người gửi
    const userMessage = new ChatMessage({
      id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      conversationId: conv.id,
      senderId: currentUserId,
      senderRole: input.senderRole,
      content: input.content,
      attachments: input.attachments,
    });

    await this.messageRepo.save(userMessage);

    // 3. Xử lý phản hồi tự động nếu là kênh AI_BOT qua AI Engine (với Graceful Fallback)
    let aiReply: ChatMessage | undefined;
    if (conv.channelType === 'AI_BOT') {
      const aiResult = await this.llmProvider.generateReply(input.content || '', {
        conversationId: conv.id,
        orderId: conv.orderId,
        userId: currentUserId,
        userRole: currentUserRole,
      });

      aiReply = new ChatMessage({
        id: `msg_ai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        conversationId: conv.id,
        senderId: 'SYSTEM_AI',
        senderRole: 'AI',
        content: aiResult.content,
        metadata: {
          model: aiResult.modelUsed,
          toolCalls: aiResult.toolCalls,
          ...aiResult.metadata,
        },
      });

      await this.messageRepo.save(aiReply);
    }

    return { message: userMessage, reply: aiReply };
  }
}
