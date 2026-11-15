import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import {
  InMemoryConversationRepository,
  InMemoryChatMessageRepository,
  InMemoryPolicyRepository,
} from './infrastructure/database/InMemoryChatRepositories';
import { RedisIdempotencyService } from './infrastructure/redis/RedisIdempotencyService';
import { OrderTrackingTool } from './application/tools/OrderTrackingTool';
import { GetOrCreateConversationUseCase } from './application/use-cases/GetOrCreateConversationUseCase';
import { SendMessageUseCase } from './application/use-cases/SendMessageUseCase';
import { QueryPolicyFaqUseCase } from './application/use-cases/QueryPolicyFaqUseCase';
import { EscalateDisputeUseCase } from './application/use-cases/EscalateDisputeUseCase';
import { DisputeArbiterAI } from './infrastructure/ai/DisputeArbiterAI';
import { GeminiDamageAssessor } from './infrastructure/ai/GeminiDamageAssessor';
import { ChatController } from './interfaces/http/controllers/ChatController';
import { PolicyController } from './interfaces/http/controllers/PolicyController';
import { createChatRoutes } from './interfaces/http/routes/ChatRoutes';
import { createPolicyRoutes } from './interfaces/http/routes/PolicyRoutes';

export function createApplication(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '25mb' }));

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'chat-service',
      boundedContext:
        'Multi-party Chat, Order Tracking, Policy FAQ & Dispute Escalation (SRS 2.3, 3.1.2, 3.6)',
      timestamp: new Date().toISOString(),
      port: process.env.PORT || process.env.CHAT_SERVICE_PORT || 4008,
    });
  });

  // 1. Repositories & Infrastructure
  const conversationRepo = new InMemoryConversationRepository();
  const messageRepo = new InMemoryChatMessageRepository();
  const policyRepo = new InMemoryPolicyRepository();
  const idempotencyService = new RedisIdempotencyService();
  const orderTrackingTool = new OrderTrackingTool();
  const damageAssessor = new GeminiDamageAssessor();

  // 2. Use Cases
  const getOrCreateConversationUseCase = new GetOrCreateConversationUseCase(conversationRepo);
  const queryPolicyFaqUseCase = new QueryPolicyFaqUseCase(policyRepo);
  const escalateDisputeUseCase = new EscalateDisputeUseCase(conversationRepo, idempotencyService);
  const sendMessageUseCase = new SendMessageUseCase(
    messageRepo,
    conversationRepo,
    orderTrackingTool,
    undefined,
    policyRepo,
    damageAssessor,
    escalateDisputeUseCase,
  );

  // 3. Controllers
  const disputeArbiterAi = new DisputeArbiterAI();
  const chatController = new ChatController(
    getOrCreateConversationUseCase,
    sendMessageUseCase,
    escalateDisputeUseCase,
    conversationRepo,
    messageRepo,
    disputeArbiterAi,
  );
  const policyController = new PolicyController(queryPolicyFaqUseCase, policyRepo);

  // 4. Routes
  const chatRoutes = createChatRoutes(chatController);
  const policyRoutes = createPolicyRoutes(policyController);

  app.use('/api/v1/chat', chatRoutes);
  app.use('/api/v1/chat', policyRoutes);

  return app;
}
