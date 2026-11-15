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
import { GeminiDamageAssessor } from '../../infrastructure/ai/GeminiDamageAssessor';
import { EscalateDisputeUseCase } from './EscalateDisputeUseCase';

export class SendMessageUseCase {
  private readonly llmProvider: ILanguageModelProvider;
  private readonly damageAssessor: GeminiDamageAssessor;
  private readonly escalateDisputeUseCase?: EscalateDisputeUseCase;

  constructor(
    private readonly messageRepo: IChatMessageRepository,
    private readonly conversationRepo: IConversationRepository,
    private readonly orderTrackingTool?: OrderTrackingTool,
    llmProvider?: ILanguageModelProvider,
    policyRepo?: IPolicyRepository,
    damageAssessor?: GeminiDamageAssessor,
    escalateDisputeUseCase?: EscalateDisputeUseCase,
  ) {
    this.llmProvider =
      llmProvider ||
      new GeminiLlmProvider({
        orderTrackingTool: this.orderTrackingTool,
        policyRepo,
      });
    this.damageAssessor = damageAssessor || new GeminiDamageAssessor();
    this.escalateDisputeUseCase = escalateDisputeUseCase;
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

    // 3. Xử lý phản hồi tự động nếu là kênh AI_BOT
    let aiReply: ChatMessage | undefined;
    if (conv.channelType === 'AI_BOT') {
      // Nhánh Khiếu Nại (Vision-Path): Kiểm tra xem có ảnh đính kèm không
      const hasImageAttachments = (input.attachments || []).some((att) => {
        const mime = (att.mimeType || '').toLowerCase();
        const urlOrName = (att.url || att.filename || '').toLowerCase();
        return mime.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(urlOrName);
      });

      if (hasImageAttachments) {
        const damageVerdict = await this.damageAssessor.assessDamage(
          input.content || '',
          input.attachments,
        );

        // Nếu phát hiện có hư hại (is_damaged: true) và có orderId -> Tự động kích hoạt EscalateDisputeUseCase
        if (damageVerdict.is_damaged && this.escalateDisputeUseCase && conv.orderId) {
          try {
            const escalateResult = await this.escalateDisputeUseCase.execute({
              orderId: conv.orderId,
              buyerId: currentUserId,
              buyerName: 'Khách hàng Nexus',
              reason: input.content || damageVerdict.summary || 'Khiếu nại kiện hàng hư hại',
              attachments: input.attachments,
              aiVerdict: damageVerdict,
            });

            const comfortingReply =
              `Chào bạn, Nexus AI rất tiếc về sự cố sản phẩm không nguyên vẹn của bạn. ` +
              `Chúng tôi đã giám định hình ảnh và ghi nhận: ${damageVerdict.summary || 'Phát hiện dấu hiệu nứt vỡ ngoại quan'}.\n\n` +
              `Hệ thống đã tự động lập hồ sơ khiếu nại mã #${escalateResult.caseId} và gửi yêu cầu đối soát video đóng gói tới Người bán trong vòng 24h.\n\n` +
              `Bạn hoàn toàn an tâm nhé! Theo Chính sách Bảo hiểm Vận chuyển Nexus, bạn sẽ được hỗ trợ hoàn tiền 100% nếu xác định lỗi do bưu tá hoặc người bán.`;

            aiReply = new ChatMessage({
              id: `msg_ai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
              conversationId: conv.id,
              senderId: 'SYSTEM_AI',
              senderRole: 'AI',
              content: comfortingReply,
              metadata: {
                model: 'gemini-1.5-flash-vision',
                is_damaged: true,
                caseId: escalateResult.caseId,
                severity: damageVerdict.severity,
                damageVerdict,
                escalated: true,
              },
            });

            await this.messageRepo.save(aiReply);
            return { message: userMessage, reply: aiReply };
          } catch (escErr: any) {
            console.warn(`[SendMessageUseCase] Lỗi tự động escalate dispute: ${escErr?.message}`);
          }
        }
      }

      // Nhánh Tra Cứu (Fast-Path) / Hỏi đáp LLM thông thường
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
