import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { InMemoryNotificationRepository } from './infrastructure/repositories/InMemoryNotificationRepository';
import { GetNotificationDetailUseCase } from './application/use-cases/GetNotificationDetailUseCase';
import { NotificationController } from './interfaces/http/controllers/NotificationController';
import { createNotificationRoutes } from './interfaces/http/routes/NotificationRoutes';

export function createApplication(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'notification-service',
      boundedContext: 'Email, Push & In-App Notification (SRS 3.2)',
      port: process.env.NOTIFICATION_SERVICE_PORT || 3006,
      timestamp: new Date().toISOString(),
    });
  });

  const notificationRepository = new InMemoryNotificationRepository();
  const getNotificationDetailUseCase = new GetNotificationDetailUseCase(notificationRepository);
  const notificationController = new NotificationController(getNotificationDetailUseCase);

  app.use('/api/v1/notifications', createNotificationRoutes(notificationController));

  return app;
}
