import { Router } from 'express';
import { ChatController } from '../controllers/ChatController';
import { requireAuth } from '../../../infrastructure/security/auth';

export function createChatRoutes(controller: ChatController): Router {
  const router = Router();

  // 1. Mở hoặc tìm phòng chat theo orderId và channelType
  router.post('/conversations', requireAuth, (req, res) => controller.openConversation(req, res));

  // 2. Chi tiết phòng chat
  router.get('/conversations/:id', requireAuth, (req, res) => controller.getConversation(req, res));

  // 3. Danh sách các phòng chat thuộc về đơn hàng mà người dùng có quyền
  router.get('/orders/:orderId/conversations', requireAuth, (req, res) =>
    controller.listOrderConversations(req, res),
  );

  // 4. Gửi tin nhắn vào cuộc hội thoại
  router.post('/conversations/:id/messages', requireAuth, (req, res) =>
    controller.sendMessage(req, res),
  );

  // 5. Lấy danh sách tin nhắn (hỗ trợ ?after=<timestamp> cho Polling)
  router.get('/conversations/:id/messages', requireAuth, (req, res) =>
    controller.getMessages(req, res),
  );

  // 6. Bàn giao khiếu nại kẹp khóa chống trùng Idempotency sang Support Staff (Kịch bản C)
  router.post('/escalate', requireAuth, (req, res) => controller.escalateDispute(req, res));

  // 7. Alias routes cho phiên chat (hỗ trợ Support Staff Portal & Client gọi qua /sessions/:id/messages)
  router.post('/sessions/:id/messages', requireAuth, (req, res) =>
    controller.sendMessage(req, res),
  );
  router.get('/sessions/:id/messages', requireAuth, (req, res) => controller.getMessages(req, res));
  router.get('/sessions/:id', requireAuth, (req, res) => controller.getConversation(req, res));

  // 8. Thẩm định đối soát chứng cứ cho Support Staff (AI Copilot Arbiter - Task BE-05)
  router.post('/dispute/analyze-evidence', requireAuth, (req, res) =>
    controller.analyzeDisputeEvidence(req, res),
  );

  // 9. Task BE-03: Endpoint thống nhất gửi tin nhắn chat (hỗ trợ cả conversationId hoặc orderId)
  router.post('/message', requireAuth, (req, res) => controller.sendDirectMessage(req, res));

  return router;
}
