import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import type { Pool } from 'pg';
import { InMemoryNotificationRepository } from './infrastructure/repositories/InMemoryNotificationRepository';
import { PostgresNotificationRepository } from './infrastructure/repositories/PostgresNotificationRepository';
import { INotificationRepository } from './domain/repositories/INotificationRepository';
import { GetNotificationDetailUseCase } from './application/use-cases/GetNotificationDetailUseCase';
import { NotificationController } from './interfaces/http/controllers/NotificationController';
import { createNotificationRoutes } from './interfaces/http/routes/NotificationRoutes';
import { InMemoryEventLogRepository } from './infrastructure/repositories/InMemoryEventLogRepository';
import { PostgresEventLogRepository } from './infrastructure/repositories/PostgresEventLogRepository';
import { IEventLogRepository } from './domain/repositories/IEventLogRepository';
import { EventLogService } from './application/services/EventLogService';
import { EventLogController } from './interfaces/http/controllers/EventLogController';
import { createEventLogRoutes } from './interfaces/http/routes/EventLogRoutes';
import { GlobalEventAuditSubscriber } from './application/listeners/GlobalEventAuditSubscriber';
import { EmailService } from './infrastructure/email/EmailService';
import { RabbitMqEventPublisher } from './infrastructure/messaging/RabbitMqEventPublisher';
import { getNotificationPool } from './infrastructure/database/pgPool';

export interface AppDependencies {
  eventLogRepository?: IEventLogRepository;
  notificationRepository?: INotificationRepository;
  eventPublisher?: RabbitMqEventPublisher;
  emailService?: EmailService;
  databasePool?: Pool;
  useInMemory?: boolean;
}

export function createApplication(deps?: AppDependencies): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const useInMemory =
    deps?.useInMemory ??
    (process.env.USE_IN_MEMORY_DB === 'true' || process.env.NODE_ENV === 'test');

  const pool = !useInMemory ? deps?.databasePool || getNotificationPool() : undefined;

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'notification-service',
      boundedContext: 'Email, Push & In-App Notification (SRS 3.2)',
      storage: useInMemory ? 'in-memory' : 'postgresql',
      port: process.env.PORT || process.env.NOTIFICATION_SERVICE_PORT || 4006,
      timestamp: new Date().toISOString(),
    });
  });

  // Event Logs (Audit according to SRS 2.7 & 3.2.1 — persisted to PostgreSQL by default)
  // Mount TRƯỚC /api/v1/notifications để /api/v1/notifications/event-logs không bị bắt bởi /:id
  const eventLogRepository: IEventLogRepository =
    deps?.eventLogRepository ||
    (pool ? new PostgresEventLogRepository(pool) : new InMemoryEventLogRepository());
  const eventLogService = new EventLogService(eventLogRepository);
  const eventLogController = new EventLogController(eventLogService);
  app.use('/api/v1/event-logs', createEventLogRoutes(eventLogController));
  app.use('/api/v1/notifications/event-logs', createEventLogRoutes(eventLogController));

  // Event Bus + Global Audit Subscriber (always active so published domain events persist automatically)
  const eventPublisher = deps?.eventPublisher || new RabbitMqEventPublisher();
  const subscriber = new GlobalEventAuditSubscriber(eventLogService);
  subscriber.register(eventPublisher);

  // Email & Notifications (persisted to PostgreSQL by default)
  const emailService = deps?.emailService || new EmailService();
  const notificationRepository: INotificationRepository =
    deps?.notificationRepository ||
    (pool ? new PostgresNotificationRepository(pool) : new InMemoryNotificationRepository());
  const getNotificationDetailUseCase = new GetNotificationDetailUseCase(notificationRepository);
  const notificationController = new NotificationController(
    getNotificationDetailUseCase,
    emailService,
    notificationRepository,
    eventPublisher,
  );
  app.use('/api/v1/notifications', createNotificationRoutes(notificationController));

  return app;
}
