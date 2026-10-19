import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { InMemoryNotificationRepository } from './infrastructure/repositories/InMemoryNotificationRepository';
import { GetNotificationDetailUseCase } from './application/use-cases/GetNotificationDetailUseCase';
import { NotificationController } from './interfaces/http/controllers/NotificationController';
import { createNotificationRoutes } from './interfaces/http/routes/NotificationRoutes';
import { InMemoryEventLogRepository } from './infrastructure/repositories/InMemoryEventLogRepository';
import { IEventLogRepository } from './domain/repositories/IEventLogRepository';
import { EventLogService } from './application/services/EventLogService';
import { EventLogController } from './interfaces/http/controllers/EventLogController';
import { createEventLogRoutes } from './interfaces/http/routes/EventLogRoutes';
import { GlobalEventAuditSubscriber } from './application/listeners/GlobalEventAuditSubscriber';

export interface AppDependencies {
  eventLogRepository?: IEventLogRepository;
  eventPublisher?: any;
}

export function createApplication(deps?: AppDependencies): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'notification-service',
      boundedContext: 'Email, Push & In-App Notification (SRS 3.2)',
      port: process.env.PORT || process.env.NOTIFICATION_SERVICE_PORT || 4006,
      timestamp: new Date().toISOString(),
    });
  });

  // Notifications
  const notificationRepository = new InMemoryNotificationRepository();
  const getNotificationDetailUseCase = new GetNotificationDetailUseCase(notificationRepository);
  const notificationController = new NotificationController(getNotificationDetailUseCase);
  app.use('/api/v1/notifications', createNotificationRoutes(notificationController));

  // Event Logs (Audit according to SRS 2.7 & 3.2.1)
  const eventLogRepository = deps?.eventLogRepository || new InMemoryEventLogRepository();
  const eventLogService = new EventLogService(eventLogRepository);
  const eventLogController = new EventLogController(eventLogService);
  app.use('/api/v1/event-logs', createEventLogRoutes(eventLogController));

  // Auto-subscribe to EventPublisher if provided
  if (deps?.eventPublisher) {
    const subscriber = new GlobalEventAuditSubscriber(eventLogService);
    subscriber.register(deps.eventPublisher);
  }

  return app;
}
