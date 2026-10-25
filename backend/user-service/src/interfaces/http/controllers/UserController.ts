import { Request, Response } from 'express';
import { GetUserProfileUseCase } from '../../../application/use-cases/GetUserProfileUseCase';
import { SearchUsersUseCase } from '../../../application/use-cases/SearchUsersUseCase';
import { LoginUseCase } from '../../../application/use-cases/LoginUseCase';
import { LogoutUseCase } from '../../../application/use-cases/LogoutUseCase';
import { RegisterUseCase } from '../../../application/use-cases/RegisterUseCase';
import { RegisterUserUseCase } from '../../../application/use-cases/RegisterUserUseCase';
import { RequestPasswordResetUseCase } from '../../../application/use-cases/RequestPasswordResetUseCase';
import { ResetPasswordUseCase } from '../../../application/use-cases/ResetPasswordUseCase';
import { AssignUserRoleUseCase } from '../../../application/use-cases/AssignUserRoleUseCase';
import { AccountLockedException } from '../../../domain/exceptions/AccountLockedException';
import { AccountSuspendedException } from '../../../domain/exceptions/AccountSuspendedException';
import { InvalidCredentialsException } from '../../../domain/exceptions/InvalidCredentialsException';
import { InvalidTokenException } from '../../../domain/exceptions/InvalidTokenException';
import { UserInactiveException } from '../../../domain/exceptions/UserInactiveException';
import { UserNotFoundException } from '../../../domain/exceptions/UserNotFoundException';
import { UserAlreadyExistsException } from '../../../domain/exceptions/UserAlreadyExistsException';
import { ROLE_PERMISSIONS } from '../../../infrastructure/security/authorization';

export class UserController {
  constructor(
    private readonly getUserProfileUseCase: GetUserProfileUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly registerUseCase: RegisterUseCase | RegisterUserUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly assignUserRoleUseCase: AssignUserRoleUseCase,
    private readonly searchUsersUseCase?: SearchUsersUseCase,
  ) {}

  public async listUsers(req: Request, res: Response): Promise<void> {
    try {
      if (!this.searchUsersUseCase) {
        res.status(500).json({ success: false, error: 'SearchUsersUseCase not configured.' });
        return;
      }

      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const email = typeof req.query.email === 'string' ? req.query.email : undefined;
      const role = typeof req.query.role === 'string' ? req.query.role : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const sortBy = typeof req.query.sortBy === 'string' ? (req.query.sortBy as any) : undefined;
      const sortOrder =
        typeof req.query.sortOrder === 'string' ? (req.query.sortOrder as any) : undefined;

      const result = await this.searchUsersUseCase.execute({
        q,
        email,
        role,
        status,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.totalPages,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      });
    }
  }

  public async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUserId = (req as Request & { user?: { sub: string } }).user?.sub;
      const requestedId = req.params.id;
      const queryEmail = typeof req.query.email === 'string' ? req.query.email : undefined;
      const targetParam = Array.isArray(requestedId) ? requestedId[0] : requestedId;
      const targetIdentifier = queryEmail || targetParam || authenticatedUserId;

      if (!targetIdentifier) {
        res.status(400).json({ success: false, error: 'User id or email is required.' });
        return;
      }
      const profile = await this.getUserProfileUseCase.execute(targetIdentifier);

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
      });
    }
  }

  public async register(req: Request, res: Response): Promise<void> {
    try {
      const user = await this.registerUseCase.execute(req.body || {});
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed.';
      const status =
        error instanceof UserAlreadyExistsException ||
        message.includes('already exists') ||
        message.includes('đã tồn tại')
          ? 409
          : 400;
      res.status(status).json({ success: false, error: message });
    }
  }

  public async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const token = await this.requestPasswordResetUseCase.execute(req.body?.email);
      const response: { success: true; message: string; resetToken?: string } = {
        success: true,
        message: 'If the account exists, password reset instructions will be sent.',
      };

      if (process.env.NODE_ENV !== 'production' && token) {
        response.resetToken = token;
      }
      res.status(200).json(response);
    } catch {
      res.status(200).json({
        success: true,
        message: 'If the account exists, password reset instructions will be sent.',
      });
    }
  }

  public async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      await this.resetPasswordUseCase.execute(req.body?.token, req.body?.newPassword);
      res.status(200).json({ success: true, message: 'Password has been reset.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password reset failed.';
      res.status(400).json({ success: false, error: message });
    }
  }

  public async assignRole(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.assignUserRoleUseCase.execute(
        Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
        req.body?.role,
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Role assignment failed.';
      res
        .status(message === 'User not found.' ? 404 : 400)
        .json({ success: false, error: message });
    }
  }

  public listRoles(_req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      data: Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => ({
        role,
        permissions,
      })),
    });
  }

  public async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body || {};
      const result = await this.loginUseCase.execute({ email, password });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (
        error instanceof AccountLockedException ||
        error instanceof AccountSuspendedException ||
        error instanceof InvalidCredentialsException ||
        error instanceof UserInactiveException ||
        error instanceof UserNotFoundException
      ) {
        const status =
          error instanceof AccountLockedException || error instanceof AccountSuspendedException
            ? 423
            : 401;
        res.status(status).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
      });
    }
  }

  public async logout(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization || '';
      const result = await this.logoutUseCase.execute(authHeader);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof InvalidTokenException) {
        res.status(401).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
      });
    }
  }
}
