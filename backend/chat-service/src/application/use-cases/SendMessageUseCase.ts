import { IChatMessageRepository } from '../../domain/repositories/IChatMessageRepository';
import { IConversationRepository } from '../../domain/repositories/IConversationRepository';
import { ChatMessage } from '../../domain/entities/ChatMessage';
import { SendMessageInput } from '../dtos/ChatDtos';
import { ConversationNotFoundException } from '../../domain/exceptions/ConversationNotFoundException';
import { ChatForbiddenException } from '../../domain/exceptions/ChatForbiddenException';
import { OrderTrackingTool } from '../tools/OrderTrackingTool';

export class SendMessageUseCase {
  constructor(
    private readonly messageRepo: IChatMessageRepository,
    private readonly conversationRepo: IConversationRepository,
    private readonly orderTrackingTool?: OrderTrackingTool,
  ) {}

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

    // 3. Xử lý phản hồi tự động nếu là kênh AI_BOT (Kịch bản A: Tra cứu vận đơn)
    let aiReply: ChatMessage | undefined;
    if (conv.channelType === 'AI_BOT') {
      const lower = (input.content || '').toLowerCase();

      // Nếu câu hỏi có ý định hỏi vị trí đơn / vận đơn
      if (
        lower.includes('đến đâu') ||
        lower.includes('vận đơn') ||
        lower.includes('giao') ||
        lower.includes('vị trí') ||
        lower.includes('tracking')
      ) {
        const trackingTool = this.orderTrackingTool || new OrderTrackingTool();
        const trackingInfo = await trackingTool.trackByOrder(conv.orderId);

        let replyText = `Đơn hàng ${conv.orderId} của bạn hiện có trạng thái: ${trackingInfo?.status || 'Đang giao'}.`;
        if (trackingInfo) {
          replyText = `Đơn hàng ${conv.orderId} đang được hãng ${trackingInfo.carrier} vận chuyển với mã tra cứu ${trackingInfo.trackingCode}. Hiện tại kiện hàng đang ở: ${trackingInfo.currentLocation} (${trackingInfo.estimatedDelivery}).`;
        }

        aiReply = new ChatMessage({
          id: `msg_ai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          conversationId: conv.id,
          senderId: 'SYSTEM_AI',
          senderRole: 'AI',
          content: replyText,
          metadata: {
            toolName: 'OrderTrackingTool',
            trackingData: trackingInfo,
          },
        });

        await this.messageRepo.save(aiReply);
      }
    }

    return { message: userMessage, reply: aiReply };
  }
}
