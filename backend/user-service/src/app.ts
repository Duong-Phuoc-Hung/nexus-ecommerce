import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { InMemoryUserRepository } from './infrastructure/repositories/InMemoryUserRepository';
import { PostgresUserRepository } from './infrastructure/repositories/PostgresUserRepository';
import { GetUserProfileUseCase } from './application/use-cases/GetUserProfileUseCase';
import { LoginUseCase } from './application/use-cases/LoginUseCase';
import { LogoutUseCase } from './application/use-cases/LogoutUseCase';
import { RegisterUserUseCase } from './application/use-cases/RegisterUserUseCase';
import { RequestPasswordResetUseCase } from './application/use-cases/RequestPasswordResetUseCase';
import { ResetPasswordUseCase } from './application/use-cases/ResetPasswordUseCase';
import { AssignUserRoleUseCase } from './application/use-cases/AssignUserRoleUseCase';
import { UserController } from './interfaces/http/controllers/UserController';
import { createAuthRoutes, createUserRoutes } from './interfaces/http/routes/UserRoutes';
import { authTokenStore } from './infrastructure/security/AuthTokenStore';
import { passwordResetTokenStore } from './infrastructure/security/PasswordResetTokenStore';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './interfaces/http/swagger';

export function createApplication(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

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
  const loginUseCase = new LoginUseCase(userRepository);
  const logoutUseCase = new LogoutUseCase();
  const registerUserUseCase = new RegisterUserUseCase(userRepository);
  const requestPasswordResetUseCase = new RequestPasswordResetUseCase(
    userRepository,
    passwordResetTokenStore,
  );
  const resetPasswordUseCase = new ResetPasswordUseCase(
    userRepository,
    passwordResetTokenStore,
    authTokenStore,
  );
  const assignUserRoleUseCase = new AssignUserRoleUseCase(userRepository, (userId) =>
    authTokenStore.revokeUserTokens(userId),
  );
  const userController = new UserController(
    getUserProfileUseCase,
    loginUseCase,
    logoutUseCase,
    registerUserUseCase,
    requestPasswordResetUseCase,
    resetPasswordUseCase,
    assignUserRoleUseCase,
  );

  app.use('/api/v1/auth', createAuthRoutes(userController));
  app.use('/api/v1/users', createUserRoutes(userController));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  return app;
}
