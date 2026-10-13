import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { InMemoryUserRepository } from './infrastructure/repositories/InMemoryUserRepository';
import { PostgresUserRepository } from './infrastructure/repositories/PostgresUserRepository';
import { GetUserProfileUseCase } from './application/use-cases/GetUserProfileUseCase';
import { UserController } from './interfaces/http/controllers/UserController';
import { createUserRoutes } from './interfaces/http/routes/UserRoutes';

export function createApplication(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check endpoint (Yêu cầu nghiệm thu kiểm tra ứng dụng chạy được)
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'user-service',
      boundedContext: 'User & Authentication (SRS 3.1)',
      port: process.env.PORT || process.env.USER_SERVICE_PORT || 4001,
      timestamp: new Date().toISOString(),
    });
  });

  // Khởi tạo Dependency Injection (Composition Root)
  const userRepository =
    process.env.USE_IN_MEMORY_DB === 'true'
      ? new InMemoryUserRepository()
      : new PostgresUserRepository();
  const getUserProfileUseCase = new GetUserProfileUseCase(userRepository);
  const userController = new UserController(getUserProfileUseCase);

  // Gắn Routes vào Interface HTTP
  app.use('/api/v1/users', createUserRoutes(userController));

  return app;
}
