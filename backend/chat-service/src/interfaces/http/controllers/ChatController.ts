import { Request, Response } from 'express';
import { GetOrCreateConversationUseCase } from '../../../application/use-cases/GetOrCreateConversationUseCase';
import { SendMessageUseCase } from '../../../application/use-cases/SendMessageUseCase';
import { EscalateDisputeUseCase } from '../../../application/use-cases/EscalateDisputeUseCase';
import { IChatMessageRepository } from '../../../domain/repositories/IChatMessageRepository';
import { IConversationRepository } from '../../../domain/repositories/IConversationRepository';
import { AuthenticatedRequest } from '../../../infrastructure/security/auth';
import { ConversationNotFoundException } from '../../../domain/exceptions/ConversationNotFoundException';
import { ChatForbiddenException } from '../../../domain/exceptions/ChatForbiddenException';
import { DisputeArbiterAI } from '../../../infrastructure/ai/DisputeArbiterAI';

export class ChatController {
  constructor(
    private readonly getOrCreateConversationUseCase: GetOrCreateConversationUseCase,
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly escalateDisputeUseCase: EscalateDisputeUseCase,
    private readonly conversationRepo: IConversationRepository,
    private readonly messageRepo: IChatMessageRepository,
    private readonly disputeArbiterAi: DisputeArbiterAI = new DisputeArbiterAI(),
  ) {}

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

      res.status(200).json({
        success: true,
        data: conv.toDto(),
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
      const { content, attachments } = req.body;

      const result = await this.sendMessageUseCase.execute(
        {
          conversationId: convId,
          senderId: user.sub,
          senderRole: (user.role as any) || 'BUYER',
          content,
          attachments,
        },
        user.sub,
        user.role,
      );

      res.status(201).json({
        success: true,
        message: 'Gửi tin nhắn thành công.',
        data: {
          message: result.message.toDto(),
          reply: result.reply ? result.reply.toDto() : null,
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
          .json({ success: false, error: `Không tìm thấy cuộc hội thoại "${convId}".` });
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

      const messages = await this.messageRepo.findByConversationId(convId, limit, afterDate);

      res.status(200).json({
        success: true,
        data: messages.map((m) => m.toDto()),
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

      const { orderId, orderCode, reason, priority, attachments, aiVerdict } = req.body;

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
}
