import { IConversationRepository } from '../../domain/repositories/IConversationRepository';
import { Conversation, ChannelType } from '../../domain/entities/Conversation';
import { OpenConversationInput } from '../dtos/ChatDtos';
import { ChatForbiddenException } from '../../domain/exceptions/ChatForbiddenException';

export class GetOrCreateConversationUseCase {
  constructor(private readonly conversationRepo: IConversationRepository) {}

  public async execute(
    input: OpenConversationInput,
    currentUserId: string,
    currentUserRole?: string,
  ): Promise<Conversation> {
    const orderId = (input.orderId || '').trim();
    if (!orderId) {
      throw new Error('orderId là bắt buộc.');
    }

    const channelType = input.channelType;
    if (!['AI_BOT', 'BUYER_SELLER', 'BUYER_SUPPORT'].includes(channelType)) {
      throw new Error(
        `Kênh '${channelType}' không hợp lệ. Chỉ chấp nhận AI_BOT, BUYER_SELLER, BUYER_SUPPORT.`,
      );
    }

    // 1. Tìm cuộc hội thoại đã tồn tại
    let conv = await this.conversationRepo.findByOrderAndChannel(orderId, channelType);

    if (conv) {
      // Kiểm tra quyền truy cập (Anti-IDOR)
      if (!conv.canAccess(currentUserId, currentUserRole)) {
        throw new ChatForbiddenException(
          'Bạn không có quyền truy cập vào kênh hội thoại của đơn hàng này.',
        );
      }
      return conv;
    }

    // 2. Nếu chưa có, tạo mới
    const buyerId = input.buyerId || currentUserId;
    const sellerId = input.sellerId || 'usr_seller_demo_01';

    // Rào chắn bảo mật: Seller cố ý tạo kênh BUYER_SUPPORT sẽ bị từ chối
    const normalizedRole = (currentUserRole || '').toUpperCase();
    if (normalizedRole === 'SELLER' && channelType === 'BUYER_SUPPORT') {
      throw new ChatForbiddenException(
        'Người bán không có quyền mở hoặc can thiệp vào kênh hỗ trợ khiếu nại riêng của khách hàng.',
      );
    }

    conv = new Conversation({
      id: `conv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      orderId,
      channelType,
      buyerId,
      sellerId,
      status: 'ACTIVE',
    });

    // Kiểm tra quyền trước khi lưu
    if (!conv.canAccess(currentUserId, currentUserRole)) {
      throw new ChatForbiddenException('Bạn không có quyền khởi tạo kênh hội thoại này.');
    }

    await this.conversationRepo.save(conv);
    return conv;
  }
}
