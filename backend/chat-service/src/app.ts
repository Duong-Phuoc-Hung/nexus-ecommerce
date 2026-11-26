import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import {
  InMemoryConversationRepository,
  InMemoryChatMessageRepository,
  InMemoryPolicyRepository,
} from './infrastructure/database/InMemoryChatRepositories';
import {
  PostgresConversationRepository,
  PostgresChatMessageRepository,
} from './infrastructure/database/PostgresChatRepositories';
import { IConversationRepository } from './domain/repositories/IConversationRepository';
import { IChatMessageRepository } from './domain/repositories/IChatMessageRepository';
import { RedisIdempotencyService } from './infrastructure/redis/RedisIdempotencyService';
import { OrderTrackingTool } from './application/tools/OrderTrackingTool';
import { GetOrCreateConversationUseCase } from './application/use-cases/GetOrCreateConversationUseCase';
import { SendMessageUseCase } from './application/use-cases/SendMessageUseCase';
import { QueryPolicyFaqUseCase } from './application/use-cases/QueryPolicyFaqUseCase';
import { EscalateDisputeUseCase } from './application/use-cases/EscalateDisputeUseCase';
import { DisputeArbiterAI } from './infrastructure/ai/DisputeArbiterAI';
import { ChatController } from './interfaces/http/controllers/ChatController';
import { PolicyController } from './interfaces/http/controllers/PolicyController';
import { createChatRoutes } from './interfaces/http/routes/ChatRoutes';
import { createPolicyRoutes } from './interfaces/http/routes/PolicyRoutes';
import { GeminiDamageAssessor } from './infrastructure/ai/GeminiDamageAssessor';
import { GeminiLlmProvider } from './infrastructure/ai/GeminiLlmProvider';
import { getGeminiRuntimeStatus } from './infrastructure/ai/geminiModels';
import { IDamageAssessor } from './application/ports/IDamageAssessor';
import { HandoverConversationUseCase } from './application/use-cases/HandoverConversationUseCase';
import { DamageAssessmentController } from './interfaces/http/controllers/DamageAssessmentController';
import { verifyHandoverParticipant } from './infrastructure/security/chat-task-auth';

export function createApplication(options: { damageAssessor?: IDamageAssessor } = {}): Application {
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
      ai: getGeminiRuntimeStatus(),
    });
  });

  // 1. Repositories & Infrastructure
  const useInMemory =
    process.env.NODE_ENV === 'test' ||
    process.env.USE_IN_MEMORY_DB === 'true' ||
    !process.env.CHAT_DB_URL;

  let conversationRepo: IConversationRepository;
  let messageRepo: IChatMessageRepository;

  if (useInMemory) {
    messageRepo = new InMemoryChatMessageRepository();
    conversationRepo = new InMemoryConversationRepository(messageRepo);
  } else {
    const pool = new Pool({
      connectionString:
        process.env.CHAT_DB_URL ||
        'postgresql://nexus_chat:nexus_password@localhost:5438/nexus_chat_db',
    });
    conversationRepo = new PostgresConversationRepository(pool);
    messageRepo = new PostgresChatMessageRepository(pool);
  }

  const policyRepo = new InMemoryPolicyRepository();
  const idempotencyService = new RedisIdempotencyService();
  const orderTrackingTool = new OrderTrackingTool();
  const llmProvider = new GeminiLlmProvider({
    orderTrackingTool,
    policyRepo,
  });
  const damageAssessor = new GeminiDamageAssessor();

  // 2. Use Cases
  const getOrCreateConversationUseCase = new GetOrCreateConversationUseCase(conversationRepo);
  const queryPolicyFaqUseCase = new QueryPolicyFaqUseCase(policyRepo);
  const escalateDisputeUseCase = new EscalateDisputeUseCase(conversationRepo, idempotencyService);
  const handoverConversationUseCase = new HandoverConversationUseCase(conversationRepo);
  const sendMessageUseCase = new SendMessageUseCase(
    messageRepo,
    conversationRepo,
    orderTrackingTool,
    llmProvider,
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
    handoverConversationUseCase,
    disputeArbiterAi,
    llmProvider,
  );
  const damageController = new DamageAssessmentController(options.damageAssessor ?? damageAssessor);
  const policyController = new PolicyController(queryPolicyFaqUseCase, policyRepo);

  // 4. Routes
  const chatRoutes = createChatRoutes(
    chatController,
    damageController,
    verifyHandoverParticipant(conversationRepo),
  );
  const policyRoutes = createPolicyRoutes(policyController);

  app.use('/api/v1/chat', chatRoutes);
  app.use('/api/v1', chatRoutes);
  app.use('/api/v1/chat', policyRoutes);

  return app;
}
