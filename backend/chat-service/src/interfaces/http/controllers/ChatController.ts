import { Request, Response } from 'express';
import { GetOrCreateConversationUseCase } from '../../../application/use-cases/GetOrCreateConversationUseCase';
import { SendMessageUseCase } from '../../../application/use-cases/SendMessageUseCase';
import { EscalateDisputeUseCase } from '../../../application/use-cases/EscalateDisputeUseCase';
import { IChatMessageRepository } from '../../../domain/repositories/IChatMessageRepository';
import { IConversationRepository } from '../../../domain/repositories/IConversationRepository';
import { Conversation, ChannelType } from '../../../domain/entities/Conversation';
import { ChatMessage } from '../../../domain/entities/ChatMessage';
import { AuthenticatedRequest } from '../../../infrastructure/security/auth';
import { ConversationNotFoundException } from '../../../domain/exceptions/ConversationNotFoundException';
import { ChatForbiddenException } from '../../../domain/exceptions/ChatForbiddenException';
import { DisputeArbiterAI } from '../../../infrastructure/ai/DisputeArbiterAI';
import { HandoverConversationUseCase } from '../../../application/use-cases/HandoverConversationUseCase';
import { HandoverConflictException } from '../../../domain/exceptions/HandoverConflictException';
import { ILanguageModelProvider } from '../../../application/ports/ILanguageModelProvider';
import { GeminiLlmProvider } from '../../../infrastructure/ai/GeminiLlmProvider';
import { getGeminiRuntimeStatus } from '../../../infrastructure/ai/geminiModels';
import { emitChatEvent } from '../../../infrastructure/websocket/socket';

export class ChatController {
  constructor(
    private readonly getOrCreateConversationUseCase: GetOrCreateConversationUseCase,
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly escalateDisputeUseCase: EscalateDisputeUseCase,
    private readonly conversationRepo: IConversationRepository,
    private readonly messageRepo: IChatMessageRepository,
    private readonly handoverConversationUseCase: HandoverConversationUseCase,
    private readonly disputeArbiterAi: DisputeArbiterAI = new DisputeArbiterAI(),
    private readonly llmProvider: ILanguageModelProvider = new GeminiLlmProvider(),
  ) {}

  /**
   * GET /api/v1/chat/ai/status
   * Trả về trạng thái cấu hình Gemini AI (tuyệt đối không trả API key)
   */
  public getAiStatus(_req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      data: getGeminiRuntimeStatus(),
    });
  }

  /**
   * POST /api/v1/chat/ask
   * Trợ lý AI hỏi đáp chung theo ngữ cảnh trang (Catalog, Product, Auction, Cart, Policy)
   */
  public async askAssistant(req: Request, res: Response): Promise<void> {
    try {
      const { question, context } = req.body || {};
      if (typeof question !== 'string' || !question.trim() || question.length > 2000) {
        res.status(400).json({
          success: false,
          error: 'Nội dung câu hỏi cần từ 1 đến 2000 ký tự.',
        });
        return;
      }

      const user = (req as AuthenticatedRequest).user;
      const result = await this.llmProvider.generateReply(question.trim(), {
        conversationId: 'assistant_general',
        userId: user?.sub || 'guest',
        userRole: user?.role || 'GUEST',
        orderId: typeof context?.orderId === 'string' ? context.orderId : undefined,
        pageContext: context && typeof context === 'object' ? context : undefined,
      });

      res.status(200).json({
        success: true,
        data: {
          answer: result.content,
          modelUsed: result.modelUsed,
          isLiveAi: result.modelUsed !== 'rule-based-fallback',
          metadata: result.metadata,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể kết nối Trợ lý AI lúc này.',
      });
    }
  }

  public async handover(req: Request, res: Response): Promise<void> {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized.' });
      return;
    }
    const { conversationId, userId } = req.body ?? {};
    if (
      typeof conversationId !== 'string' ||
      !conversationId.trim() ||
      conversationId.length > 128 ||
      typeof userId !== 'string' ||
      !userId.trim() ||
      userId.length > 128
    ) {
      res.status(400).json({ success: false, error: 'conversationId và userId là bắt buộc.' });
      return;
    }
    try {
      const conversation = await this.handoverConversationUseCase.execute(
        { conversationId: conversationId.trim(), userId: userId.trim() },
        user.sub,
        user.role,
      );
      emitChatEvent('chat:conversation_updated', {
        conversationId: conversation.id,
        userIds: [
          conversation.buyerId,
          conversation.channelType === 'BUYER_SELLER' ? conversation.sellerId : undefined,
        ],
        notifyStaff: true,
      });
      res.status(200).json({ success: true, data: conversation.toDto() });
    } catch (error) {
      if (error instanceof ChatForbiddenException) {
        res.status(403).json({ success: false, error: error.message });
      } else if (error instanceof ConversationNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
      } else if (error instanceof HandoverConflictException) {
        res.status(409).json({ success: false, error: error.message });
      } else {
        res
          .status(500)
          .json({ success: false, error: 'Không thể ghi nhận yêu cầu CSKH. Vui lòng thử lại.' });
      }
    }
  }

  public async listHandovers(req: Request, res: Response): Promise<void> {
    const user = (req as AuthenticatedRequest).user;
    if (!user || !['ADMIN', 'SUPPORT_STAFF'].includes(user.role)) {
      res
        .status(403)
        .json({ success: false, error: 'Chỉ nhân viên hỗ trợ hoặc Admin được xem hàng chờ.' });
      return;
    }
    const limit = req.query.limit === undefined ? 50 : Number(req.query.limit);
    if (
      Array.isArray(req.query.limit) ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      res.status(400).json({ success: false, error: 'limit phải là số nguyên từ 1 đến 100.' });
      return;
    }
    try {
      const conversations = await this.conversationRepo.findWaitingForStaff(limit);
      res
        .status(200)
        .json({ success: true, data: conversations.map((conversation) => conversation.toDto()) });
    } catch {
      res.status(500).json({ success: false, error: 'Không thể tải hàng chờ CSKH.' });
    }
  }

  /**
   * POST /api/v1/chat/conversations
   * Mở hoặc tìm phòng chat theo orderId và channelType (AI_BOT, BUYER_SELLER, BUYER_SUPPORT)
   */
  public async openConversation(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized.' });
        return;
      }

      const { orderId, channelType, sellerId } = req.body;
      const conv = await this.getOrCreateConversationUseCase.execute(
        {
          orderId,
          channelType,
          buyerId: user.sub,
          sellerId,
        },
        user.sub,
        user.role,
      );

      const summary = await this.conversationRepo.getReadSummary(conv.id, user.sub, conv.buyerId);
      res.status(200).json({
        success: true,
        data: {
          ...conv.toDto(),
          ...summary,
        },
      });
    } catch (error: any) {
      if (error instanceof ChatForbiddenException) {
        res.status(403).json({ success: false, error: error.message });
        return;
      }
      res
        .status(400)
        .json({ success: false, error: error.message || 'Không thể mở phiên hội thoại.' });
    }
  }

  /**
   * GET /api/v1/chat/conversations/:id
   * Chi tiết cuộc hội thoại (kiểm tra phân quyền Anti-IDOR)
   */
  public async getConversation(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized.' });
        return;
      }

      const convId = req.params.id as string;
      const conv = await this.conversationRepo.findById(convId);
      if (!conv) {
        res
          .status(404)
          .json({ success: false, error: `Không tìm thấy cuộc hội thoại với mã "${convId}".` });
        return;
      }

      if (!conv.canAccess(user.sub, user.role)) {
        res.status(403).json({
          success: false,
          error: 'Bạn không có quyền truy cập vào cuộc hội thoại này (Anti-IDOR).',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: conv.toDto(),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/v1/chat/orders/:orderId/conversations
   * Lấy danh sách các kênh hội thoại thuộc về đơn hàng mà người dùng hiện tại có quyền xem
   */
  public async listOrderConversations(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized.' });
        return;
      }

      const orderId = req.params.orderId as string;
      const allConvs = await this.conversationRepo.findByOrderId(orderId);
      const accessibleConvs = allConvs.filter((c) => c.canAccess(user.sub, user.role));

      res.status(200).json({
        success: true,
        data: accessibleConvs.map((c) => c.toDto()),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/v1/chat/conversations
   * Lấy danh sách cuộc hội thoại theo quyền hạn người dùng (BUYER, SELLER, SUPPORT_STAFF, ADMIN)
   */
  public async listConversations(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized.' });
        return;
      }

      const role = (user.role || '').toUpperCase();
      const channelType = req.query.channelType as ChannelType | undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const orderId = typeof req.query.orderId === 'string' ? req.query.orderId : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 50;

      const filter: any = { channelType, status, orderId, limit };

      if (role === 'BUYER') {
        filter.buyerId = user.sub;
      } else if (role === 'SELLER') {
        filter.sellerId = user.sub;
      } else if (role === 'SUPPORT_STAFF' || role === 'ADMIN') {
        if (req.query.buyerId) filter.buyerId = String(req.query.buyerId);
        if (req.query.sellerId) filter.sellerId = String(req.query.sellerId);
      }

      const convs = await this.conversationRepo.findAll(filter);
      const accessibleConvs = convs.filter((c) => c.canAccess(user.sub, role));

      res.status(200).json({
        success: true,
        data: accessibleConvs.map((c) => c.toDto()),
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, error: error.message || 'Lỗi lấy danh sách hội thoại.' });
    }
  }

  /**
   * POST /api/v1/chat/conversations/:id/messages
   * Gửi tin nhắn vào cuộc hội thoại (kèm ảnh/video đính kèm)
   */
  public async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized.' });
        return;
      }

      const convId = req.params.id as string;
      const { content, attachments, clientMessageId, context } = req.body;

      const result = await this.sendMessageUseCase.execute(
        {
          conversationId: convId,
          senderId: user.sub,
          senderRole: (user.role as any) || 'BUYER',
          content,
          attachments,
          clientMessageId,
          context,
        },
        user.sub,
        user.role,
      );

      const conv = await this.conversationRepo.findById(convId).catch(() => null);
      const messageDto = result.message.toDto();
      const replyDto = result.reply ? result.reply.toDto() : null;
      emitChatEvent('chat:message', {
        conversationId: convId,
        userIds: [
          conv?.buyerId,
          conv?.channelType === 'BUYER_SELLER' ? conv?.sellerId : undefined,
          user.sub,
        ],
        notifyStaff:
          conv?.channelType === 'BUYER_SUPPORT' ||
          (conv?.channelType === 'AI_BOT' && conv?.status === 'WAITING_STAFF'),
        payload: {
          actorId: user.sub,
          message: messageDto,
          reply: replyDto,
          lastSeq: conv?.lastSeq ?? replyDto?.seq ?? messageDto.seq ?? 0,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Gửi tin nhắn thành công.',
        data: {
          message: messageDto,
          reply: replyDto,
        },
      });
    } catch (error: any) {
      if (error instanceof ConversationNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      if (error instanceof ChatForbiddenException) {
        res.status(403).json({ success: false, error: error.message });
        return;
      }
      res.status(400).json({ success: false, error: error.message || 'Không thể gửi tin nhắn.' });
    }
  }

  /**
   * GET /api/v1/chat/conversations/:id/messages
   * Lấy lịch sử tin nhắn (Hỗ trợ tham số ?after=<timestamp> phục vụ Polling MVP)
   */
  public async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized.' });
        return;
      }

      const convId = req.params.id as string;
      const conv = await this.conversationRepo.findById(convId);
      if (!conv) {
        res
          .status(404)
          .json({ success: false, error: `Không tìm thấy cuộc hội thoại với mã "${convId}".` });
        return;
      }

      if (!conv.canAccess(user.sub, user.role)) {
        res
          .status(403)
          .json({ success: false, error: 'Bạn không có quyền xem tin nhắn của kênh này.' });
        return;
      }

      const limit = req.query.limit ? Number(req.query.limit) : 50;
      let afterDate: Date | undefined;
      if (req.query.after) {
        const rawAfter = String(req.query.after);
        const parsed = Number(rawAfter);
        afterDate = !isNaN(parsed) ? new Date(parsed) : new Date(rawAfter);
      }
      const beforeSeq = req.query.before ? Number(req.query.before) : undefined;
      const afterSeq = req.query.afterSeq ? Number(req.query.afterSeq) : undefined;

      const messages = await this.messageRepo.findByConversationId(
        convId,
        limit,
        afterDate,
        beforeSeq,
        afterSeq,
      );

      const summary = await this.conversationRepo.getReadSummary(convId, user.sub, conv.buyerId);
      res.status(200).json({
        success: true,
        data: messages.map((m) => m.toDto()),
        meta: {
          conversationId: convId,
          ...summary,
          hasOlder: messages.length >= limit,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * PUT /api/v1/chat/conversations/:id/read
   * Đánh dấu đã đọc tin nhắn đến seq nào
   */
  public async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized.' });
        return;
      }

      const convId = req.params.id as string;
      const conv = await this.conversationRepo.findById(convId);
      if (!conv) {
        res
          .status(404)
          .json({ success: false, error: `Không tìm thấy cuộc hội thoại "${convId}".` });
        return;
      }

      if (!conv.canAccess(user.sub, user.role)) {
        res
          .status(403)
          .json({ success: false, error: 'Bạn không có quyền truy cập vào cuộc hội thoại này.' });
        return;
      }

      const rawSeq = req.body?.lastReadSeq ?? req.body?.seq;
      const lastReadSeq =
        rawSeq !== undefined && rawSeq !== null && Number.isFinite(Number(rawSeq))
          ? Math.max(0, Math.floor(Number(rawSeq)))
          : (await this.conversationRepo.getReadSummary(convId, user.sub, conv.buyerId)).lastSeq;
      await this.conversationRepo.markUserRead(convId, user.sub, lastReadSeq);
      conv.markRead(user.sub, user.role, lastReadSeq);
      await this.conversationRepo.update(conv);
      const summary = await this.conversationRepo.getReadSummary(convId, user.sub, conv.buyerId);
      emitChatEvent('chat:read', {
        conversationId: convId,
        userIds: [
          conv.buyerId,
          conv.channelType === 'BUYER_SELLER' ? conv.sellerId : undefined,
          user.sub,
        ],
        notifyStaff: conv.channelType === 'BUYER_SUPPORT',
        payload: {
          actorId: user.sub,
          readerRole: user.role,
          lastReadSeq,
          lastSeq: summary.lastSeq,
          buyerLastReadSeq: summary.buyerLastReadSeq,
          counterpartLastReadSeq: summary.counterpartLastReadSeq,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Đã cập nhật trạng thái đã xem thành công.',
        data: {
          conversationId: convId,
          ...summary,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/v1/chat/conversations/:id/attachments
   * Bổ sung endpoint upload file bằng chứng thực tế (Mục 3)
   */
  public async uploadAttachment(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized.' });
        return;
      }

      const convId = req.params.id as string;
      const conv = await this.conversationRepo.findById(convId);
      if (!conv) {
        res
          .status(404)
          .json({ success: false, error: `Không tìm thấy cuộc hội thoại "${convId}".` });
        return;
      }

      if (!conv.canAccess(user.sub, user.role)) {
        res
          .status(403)
          .json({ success: false, error: 'Bạn không có quyền đính kèm tệp vào kênh này.' });
        return;
      }

      const { filename, mimeType, sizeBytes, url, dataBase64 } = req.body || {};
      const ALLOWED_MIME = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
        'video/mp4',
      ];
      const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

      const targetMime = (mimeType || 'image/jpeg').toLowerCase();
      if (!ALLOWED_MIME.includes(targetMime)) {
        res.status(400).json({
          success: false,
          error: `Định dạng tệp '${targetMime}' không được hỗ trợ. Chỉ chấp nhận JPG, PNG, WEBP, PDF, MP4.`,
        });
        return;
      }

      const targetSize = Number(sizeBytes || 1024);
      if (targetSize > MAX_SIZE) {
        res.status(400).json({
          success: false,
          error: 'Dung lượng tệp vượt quá giới hạn tối đa cho phép (20MB).',
        });
        return;
      }

      const attachmentId = `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const safeFilename = (filename || 'evidence.jpg').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const finalUrl =
        url ||
        (dataBase64
          ? `data:${targetMime};base64,${dataBase64}`
          : `/uploads/chat/${convId}/${attachmentId}_${safeFilename}`);

      res.status(201).json({
        success: true,
        message: 'Tải tệp đính kèm lên thành công.',
        data: {
          attachmentId,
          url: finalUrl,
          mimeType: targetMime,
          filename: safeFilename,
          sizeBytes: targetSize,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/v1/chat/escalate
   * KỊCH BẢN C: Mở hồ sơ khiếu nại bàn giao Support Staff kẹp khóa chống trùng (Idempotency)
   */
  public async escalateDispute(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized.' });
        return;
      }

      const idempotencyKey = (req.headers['idempotency-key'] as string) || req.body.idempotencyKey;

      const { orderId, orderCode, reason, priority, attachments, aiVerdict, sharedMessages } =
        req.body;

      const result = await this.escalateDisputeUseCase.execute({
        orderId,
        orderCode,
        buyerId: user.sub,
        buyerName: user.fullName || 'Khách hàng',
        reason,
        priority,
        attachments,
        idempotencyKey,
        aiVerdict,
        sharedMessages,
      });

      const statusCode = result.isDuplicateRequest ? 200 : 201;
      res.status(statusCode).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error: any) {
      res
        .status(400)
        .json({ success: false, error: error.message || 'Không thể tạo hồ sơ khiếu nại.' });
    }
  }

  /**
   * POST /api/v1/chat/dispute/analyze-evidence
   * Task BE-05: AI Copilot Arbiter đối chiếu bằng chứng Người mua và Người bán
   */
  public async analyzeDisputeEvidence(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId, orderId, orderAmount, disputeReason, buyerEvidence, sellerEvidence } =
        req.body || {};

      const result = await this.disputeArbiterAi.analyzeEvidence({
        disputeId,
        orderId,
        orderAmount: typeof orderAmount === 'number' ? orderAmount : undefined,
        disputeReason,
        buyerEvidence,
        sellerEvidence,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể thẩm định đối soát bằng chứng tranh chấp.',
      });
    }
  }

  /**
   * POST /api/v1/chat/message
   * Task BE-03: Endpoint thống nhất gửi tin nhắn chat (hỗ trợ cả conversationId hoặc orderId)
   */
  public async sendDirectMessage(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized.' });
        return;
      }

      let { conversationId, orderId, content, attachments, channelType } = req.body || {};

      // Nếu chưa có conversationId nhưng có orderId -> Tự động tìm hoặc mở kênh AI_BOT
      if (!conversationId && orderId) {
        const conv = await this.getOrCreateConversationUseCase.execute(
          {
            orderId,
            channelType: channelType || 'AI_BOT',
            buyerId: user.sub,
          },
          user.sub,
          user.role,
        );
        conversationId = conv.id;
      }

      if (!conversationId) {
        res.status(400).json({
          success: false,
          error: 'Thiếu conversationId hoặc orderId để xác định cuộc hội thoại.',
        });
        return;
      }

      const result = await this.sendMessageUseCase.execute(
        {
          conversationId,
          senderId: user.sub,
          senderRole: (user.role as any) || 'BUYER',
          content,
          attachments,
        },
        user.sub,
        user.role,
      );

      const conv = await this.conversationRepo.findById(conversationId).catch(() => null);
      const messageDto = result.message.toDto();
      const replyDto = result.reply ? result.reply.toDto() : null;
      emitChatEvent('chat:message', {
        conversationId,
        userIds: [
          conv?.buyerId,
          conv?.channelType === 'BUYER_SELLER' ? conv?.sellerId : undefined,
          user.sub,
        ],
        notifyStaff: conv?.channelType === 'BUYER_SUPPORT',
        payload: {
          actorId: user.sub,
          message: messageDto,
          reply: replyDto,
          lastSeq: conv?.lastSeq ?? replyDto?.seq ?? messageDto.seq ?? 0,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Gửi tin nhắn thành công.',
        data: {
          message: messageDto,
          reply: replyDto,
        },
      });
    } catch (error: any) {
      if (error instanceof ConversationNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      if (error instanceof ChatForbiddenException) {
        res.status(403).json({ success: false, error: error.message });
        return;
      }
      res.status(400).json({ success: false, error: error.message || 'Không thể gửi tin nhắn.' });
    }
  }

  /**
   * POST /api/v1/chat/conversations/:id/close
   * Nhân viên Hỗ trợ / Admin kết thúc phiên hỗ trợ sau khi xử lý xong
   */
  public async closeConversation(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized.' });
        return;
      }

      const role = (user.role || '').toUpperCase();
      if (role !== 'SUPPORT_STAFF' && role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Chỉ nhân viên hỗ trợ hoặc quản trị viên mới được kết thúc phiên hỗ trợ.',
        });
        return;
      }

      const convId = req.params.id as string;
      const conv = await this.conversationRepo.findById(convId);
      if (!conv) {
        res
          .status(404)
          .json({ success: false, error: `Không tìm thấy cuộc hội thoại "${convId}".` });
        return;
      }

      if (!conv.isClosed()) {
        conv.updateStatus('CLOSED');
        const seq = conv.incrementSeq();
        await this.conversationRepo.update(conv);

        const sysMessage = new ChatMessage({
          id: `msg_sys_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          conversationId: conv.id,
          senderId: user.sub,
          senderRole: 'SYSTEM',
          content: 'Phiên hỗ trợ đã được nhân viên CSKH đánh dấu kết thúc.',
          seq,
        });
        await this.messageRepo.save(sysMessage);
      }

      res.status(200).json({
        success: true,
        message: 'Đã kết thúc phiên hỗ trợ.',
        data: conv.toDto(),
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, error: error.message || 'Không thể kết thúc phiên hỗ trợ.' });
    }
  }
}
