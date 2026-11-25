import { Request, Response } from 'express';
import { GetUserProfileUseCase } from '../../../application/use-cases/GetUserProfileUseCase';
import { SearchUsersUseCase } from '../../../application/use-cases/SearchUsersUseCase';
import { LoginUseCase } from '../../../application/use-cases/LoginUseCase';
import { LogoutUseCase } from '../../../application/use-cases/LogoutUseCase';
import { ITokenService } from '../../../application/ports/ITokenService';
import { authTokenStore } from '../../../infrastructure/security/AuthTokenStore';
import {
  getRolePermissions,
  resolveRolePermissionsAsync,
  ROLE_PERMISSIONS,
} from '../../../infrastructure/security/authorization';
import { RegisterUseCase } from '../../../application/use-cases/RegisterUseCase';
import { RegisterUserUseCase } from '../../../application/use-cases/RegisterUserUseCase';
import { RequestPasswordResetUseCase } from '../../../application/use-cases/RequestPasswordResetUseCase';
import { ResetPasswordUseCase } from '../../../application/use-cases/ResetPasswordUseCase';
import { AssignUserRoleUseCase } from '../../../application/use-cases/AssignUserRoleUseCase';
import { SendRegistrationOtpUseCase } from '../../../application/use-cases/SendRegistrationOtpUseCase';
import { UpdateUserProfileUseCase } from '../../../application/use-cases/UpdateUserProfileUseCase';
import { UpdateUserStatusUseCase } from '../../../application/use-cases/UpdateUserStatusUseCase';
import { AdjustUserReputationUseCase } from '../../../application/use-cases/AdjustUserReputationUseCase';
import { RestrictUserFeaturesUseCase } from '../../../application/use-cases/RestrictUserFeaturesUseCase';
import { GetUserAddressesUseCase } from '../../../application/use-cases/GetUserAddressesUseCase';
import {
  CreateAddressUseCase,
  AddressLimitReachedException,
} from '../../../application/use-cases/CreateAddressUseCase';
import {
  UpdateAddressUseCase,
  AddressNotFoundException,
  AddressForbiddenException,
} from '../../../application/use-cases/UpdateAddressUseCase';
import { DeleteAddressUseCase } from '../../../application/use-cases/DeleteAddressUseCase';
import { SetDefaultAddressUseCase } from '../../../application/use-cases/SetDefaultAddressUseCase';
import { AccountLockedException } from '../../../domain/exceptions/AccountLockedException';
import { AccountSuspendedException } from '../../../domain/exceptions/AccountSuspendedException';
import { InvalidCredentialsException } from '../../../domain/exceptions/InvalidCredentialsException';
import { InvalidTokenException } from '../../../domain/exceptions/InvalidTokenException';
import { UserInactiveException } from '../../../domain/exceptions/UserInactiveException';
import { UserNotFoundException } from '../../../domain/exceptions/UserNotFoundException';
import { UserAlreadyExistsException } from '../../../domain/exceptions/UserAlreadyExistsException';
import { OtpRateLimitException } from '../../../domain/exceptions/OtpRateLimitException';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import {
  classifyReputationTier,
  MIN_BID_REPUTATION_SCORE,
  MIN_SELLER_AUCTION_REPUTATION_SCORE,
  reputationLedgerStore,
  ReputationRuleCode,
} from '../../../infrastructure/state/ReputationLedgerStore';
import { getLiveSystemConfigValue } from '../routes/AdminSystemRoutes';

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
    private readonly updateUserProfileUseCase?: UpdateUserProfileUseCase,
    private readonly getUserAddressesUseCase?: GetUserAddressesUseCase,
    private readonly createAddressUseCase?: CreateAddressUseCase,
    private readonly updateAddressUseCase?: UpdateAddressUseCase,
    private readonly deleteAddressUseCase?: DeleteAddressUseCase,
    private readonly setDefaultAddressUseCase?: SetDefaultAddressUseCase,
    private readonly updateUserStatusUseCase?: UpdateUserStatusUseCase,
    private readonly sendRegistrationOtpUseCase?: SendRegistrationOtpUseCase,
    private readonly adjustUserReputationUseCase?: AdjustUserReputationUseCase,
    private readonly restrictUserFeaturesUseCase?: RestrictUserFeaturesUseCase,
    private readonly userRepository?: IUserRepository,
    private readonly tokenService?: ITokenService,
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
      const authUser = (req as Request & { user?: { sub: string; role?: string } }).user;
      const authenticatedUserId = authUser?.sub;
      const requestedId = req.params.id;
      const queryEmail = typeof req.query.email === 'string' ? req.query.email : undefined;
      const targetParam = Array.isArray(requestedId) ? requestedId[0] : requestedId;
      const targetIdentifier = targetParam ? queryEmail || targetParam : authenticatedUserId;

      if (!targetIdentifier) {
        res.status(400).json({ success: false, error: 'User id or email is required.' });
        return;
      }
      const includePrivate =
        !targetParam ||
        authUser?.role === 'ADMIN' ||
        (authenticatedUserId != null && targetParam === authenticatedUserId);
      const profile = await this.getUserProfileUseCase.execute(targetIdentifier, includePrivate);

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
  /**
   * POST /api/v1/auth/send-otp
   * Gửi mã OTP xác thực đăng ký đến Gmail
   */
  public async sendRegistrationOtp(req: Request, res: Response): Promise<void> {
    try {
      if (!this.sendRegistrationOtpUseCase) {
        res
          .status(500)
          .json({ success: false, error: 'SendRegistrationOtpUseCase chưa được cấu hình.' });
        return;
      }
      const { email, fullName, phone } = req.body || {};
      const result = await this.sendRegistrationOtpUseCase.execute(email, fullName, phone);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof OtpRateLimitException) {
        res.setHeader('Retry-After', String(error.retryAfterSeconds));
        res.status(429).json({ success: false, error: error.message });
        return;
      }
      const message = error instanceof Error ? error.message : 'Không thể gửi mã OTP.';
      const status =
        error instanceof UserAlreadyExistsException ||
        message.includes('already exists') ||
        message.includes('đã tồn tại') ||
        message.includes('đã được đăng ký')
          ? 409
          : 400;
      res.status(status).json({ success: false, error: message });
    }
  }

  public async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
      if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
        res.status(400).json({
          success: false,
          error: 'Vui lòng nhập địa chỉ email hợp lệ để đặt lại mật khẩu.',
        });
        return;
      }

      const token = await this.requestPasswordResetUseCase.execute(rawEmail);
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
        { source: req.body?.source },
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Role assignment failed.';
      const status =
        message === 'User not found.' ? 404 : message.startsWith('Policy violation:') ? 422 : 400;
      res.status(status).json({
        success: false,
        code: message.startsWith('Policy violation:') ? 'ROLE_POLICY_VIOLATION' : undefined,
        error: message,
      });
    }
  }

  public async listRoles(_req: Request, res: Response): Promise<void> {
    try {
      const repoWithRoles = this.userRepository as
        | (IUserRepository & {
            listAllRolesWithPrivileges?: () => Promise<
              Array<{
                id: string;
                code: string;
                role: string;
                name: string;
                description: string;
                permissions: string[];
              }>
            >;
          })
        | undefined;
      if (repoWithRoles && typeof repoWithRoles.listAllRolesWithPrivileges === 'function') {
        const dbRoles = await repoWithRoles.listAllRolesWithPrivileges();
        if (dbRoles.length > 0) {
          res.status(200).json({ success: true, data: dbRoles });
          return;
        }
      }
      res.status(200).json({
        success: true,
        data: Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => ({
          code: role,
          role,
          name: role,
          description: '',
          permissions,
        })),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Không thể tải danh sách vai trò.',
      });
    }
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

  public async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      if (!this.tokenService || !this.userRepository) {
        res.status(503).json({
          success: false,
          error: 'Dịch vụ làm mới phiên đăng nhập chưa được cấu hình.',
        });
        return;
      }

      const rawRefreshToken =
        typeof req.body?.refreshToken === 'string' ? req.body.refreshToken.trim() : '';
      if (!rawRefreshToken) {
        res.status(401).json({
          success: false,
          error: 'Thiếu refresh token hợp lệ.',
        });
        return;
      }

      let payload: { userId: string };
      try {
        payload = this.tokenService.verifyRefreshToken(rawRefreshToken);
      } catch {
        res.status(401).json({
          success: false,
          error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        });
        return;
      }

      // Kiểm tra thu hồi phiên (user_session_cutoffs / user_revoked_tokens)
      let iatMs: number | undefined;
      let iat = Math.floor(Date.now() / 1000);
      try {
        const parts = rawRefreshToken.split('.');
        if (parts.length === 3) {
          const decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
          if (typeof decoded.iat === 'number') iat = decoded.iat;
          if (typeof decoded.iatMs === 'number') iatMs = decoded.iatMs;
          else if (typeof decoded.iat === 'number') iatMs = decoded.iat * 1000;
        }
      } catch {
        // Ignore payload parse errors
      }

      const isRevoked = authTokenStore.hasPersistentPool()
        ? await authTokenStore.isRevokedAsync(rawRefreshToken, { sub: payload.userId, iat, iatMs })
        : authTokenStore.isRevoked(rawRefreshToken, { sub: payload.userId, iat, iatMs });

      if (isRevoked) {
        res.status(401).json({
          success: false,
          error: 'Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.',
        });
        return;
      }

      const user = await this.userRepository.findById(payload.userId);
      if (!user || !user.isActive() || user.isLocked()) {
        res.status(401).json({
          success: false,
          error: 'Tài khoản không còn hoạt động hoặc đã bị khóa.',
        });
        return;
      }

      const permissions = await resolveRolePermissionsAsync(user.role);
      const tokenPair = this.tokenService.generateTokens({
        userId: user.id,
        email: user.email,
        roles: user.roles,
        privileges: permissions,
      });
      authTokenStore.track(tokenPair.accessToken, user.id);

      res.status(200).json({
        success: true,
        data: {
          accessToken: tokenPair.accessToken,
          token: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresIn: tokenPair.expiresIn,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            roles: user.roles,
            status: user.status,
            reputationScore: user.reputationScore,
            permissions,
            privileges: permissions,
          },
        },
      });
    } catch {
      res.status(401).json({
        success: false,
        error: 'Không thể gia hạn phiên đăng nhập.',
      });
    }
  }

  private getAuthenticatedUserId(req: Request): string | undefined {
    const user = (req as any).user;
    return user?.sub || user?.id;
  }

  /**
   * PATCH /api/v1/users/profile
   * Cập nhật thông tin họ tên và số điện thoại của chính mình (P0 #2)
   */
  public async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!this.updateUserProfileUseCase) {
        res
          .status(500)
          .json({ success: false, error: 'UpdateUserProfileUseCase chưa được cấu hình.' });
        return;
      }
      const userId = this.getAuthenticatedUserId(req);
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const updated = await this.updateUserProfileUseCase.execute(userId, req.body || {});
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'Cập nhật hồ sơ thất bại.';
      const status =
        message.includes('đã được đăng ký') || message.includes('already exists') ? 409 : 400;
      res.status(status).json({
        success: false,
        error: message,
        ...(message.startsWith('INVALID_DATE_OF_BIRTH') ? { code: 'INVALID_DATE_OF_BIRTH' } : {}),
      });
    }
  }

  /**
   * GET /api/v1/users/me/addresses
   * Lấy danh sách địa chỉ nhận hàng của Buyer (P0 #3)
   */
  private addressSyncMetadata() {
    return process.env.USE_IN_MEMORY_DB === 'true'
      ? {}
      : {
          meta: { source: 'SERVER', syncedAt: new Date().toISOString(), maxAddresses: 5 },
        };
  }

  public async listAddresses(req: Request, res: Response): Promise<void> {
    try {
      if (!this.getUserAddressesUseCase) {
        res
          .status(500)
          .json({ success: false, error: 'GetUserAddressesUseCase chưa được cấu hình.' });
        return;
      }
      const userId = this.getAuthenticatedUserId(req);
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const addresses = await this.getUserAddressesUseCase.execute(userId);
      res.status(200).json({
        success: true,
        data: addresses,
        ...this.addressSyncMetadata(),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể lấy danh sách địa chỉ.',
      });
    }
  }

  /**
   * POST /api/v1/users/me/addresses
   * Thêm địa chỉ mới vào sổ địa chỉ của Buyer (P0 #4)
   */
  public async createAddress(req: Request, res: Response): Promise<void> {
    try {
      if (!this.createAddressUseCase) {
        res.status(500).json({ success: false, error: 'CreateAddressUseCase chưa được cấu hình.' });
        return;
      }
      const userId = this.getAuthenticatedUserId(req);
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const newAddress = await this.createAddressUseCase.execute(userId, req.body || {});
      res.status(201).json({
        success: true,
        data: newAddress,
        ...this.addressSyncMetadata(),
      });
    } catch (error: any) {
      if (error instanceof AddressLimitReachedException) {
        res.status(422).json({
          success: false,
          code: 'ADDRESS_LIMIT_REACHED',
          error: error.message,
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể tạo địa chỉ mới.',
      });
    }
  }

  /**
   * PATCH /api/v1/users/me/addresses/:addressId
   * Chỉnh sửa địa chỉ nhận hàng của Buyer (P0 #5)
   */
  public async updateAddress(req: Request, res: Response): Promise<void> {
    try {
      if (!this.updateAddressUseCase) {
        res.status(500).json({ success: false, error: 'UpdateAddressUseCase chưa được cấu hình.' });
        return;
      }
      const userId = this.getAuthenticatedUserId(req);
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }
      const addressId = Array.isArray(req.params.addressId)
        ? req.params.addressId[0]
        : String(req.params.addressId);

      const updated = await this.updateAddressUseCase.execute(userId, addressId, req.body || {});
      res.status(200).json({
        success: true,
        data: updated,
        ...this.addressSyncMetadata(),
      });
    } catch (error: any) {
      if (error instanceof AddressNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      if (error instanceof AddressForbiddenException) {
        res.status(403).json({ success: false, error: error.message });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể cập nhật địa chỉ.',
      });
    }
  }

  /**
   * DELETE /api/v1/users/me/addresses/:addressId
   * Xóa địa chỉ nhận hàng của Buyer (P0 #6)
   */
  public async deleteAddress(req: Request, res: Response): Promise<void> {
    try {
      if (!this.deleteAddressUseCase) {
        res.status(500).json({ success: false, error: 'DeleteAddressUseCase chưa được cấu hình.' });
        return;
      }
      const userId = this.getAuthenticatedUserId(req);
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }
      const addressId = Array.isArray(req.params.addressId)
        ? req.params.addressId[0]
        : String(req.params.addressId);

      const result = await this.deleteAddressUseCase.execute(userId, addressId);
      res.status(200).json({ ...result, ...this.addressSyncMetadata() });
    } catch (error: any) {
      if (error instanceof AddressNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      if (error instanceof AddressForbiddenException) {
        res.status(403).json({ success: false, error: error.message });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể xóa địa chỉ.',
      });
    }
  }

  /**
   * PUT /api/v1/users/me/addresses/:addressId/default
   * Đặt địa chỉ làm mặc định (P0 #7)
   */
  public async setDefaultAddress(req: Request, res: Response): Promise<void> {
    try {
      if (!this.setDefaultAddressUseCase) {
        res
          .status(500)
          .json({ success: false, error: 'SetDefaultAddressUseCase chưa được cấu hình.' });
        return;
      }
      const userId = this.getAuthenticatedUserId(req);
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }
      const addressId = Array.isArray(req.params.addressId)
        ? req.params.addressId[0]
        : String(req.params.addressId);

      const updated = await this.setDefaultAddressUseCase.execute(userId, addressId);
      res.status(200).json({
        success: true,
        data: updated,
        ...this.addressSyncMetadata(),
      });
    } catch (error: any) {
      if (error instanceof AddressNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      if (error instanceof AddressForbiddenException) {
        res.status(403).json({ success: false, error: error.message });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể đổi địa chỉ mặc định.',
      });
    }
  }

  /**
   * PATCH /api/v1/users/:id/status
   * Khóa hoặc mở khóa tài khoản người dùng kèm theo lý do vi phạm (SRS 2.3, 2.7, 3.1.2)
   * Quyền yêu cầu: USER.UPDATE (SUPPORT_STAFF, ADMIN)
   */
  public async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!this.updateUserStatusUseCase) {
        res.status(500).json({
          success: false,
          error: 'UpdateUserStatusUseCase chưa được cấu hình.',
        });
        return;
      }

      const userId = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);
      const { status, reason } = req.body || {};
      const operatorId = this.getAuthenticatedUserId(req);

      const result = await this.updateUserStatusUseCase.execute({
        userId,
        status,
        reason,
        operatorId,
      });

      res.status(200).json({
        success: true,
        message: `Đã cập nhật trạng thái người dùng thành '${result.status}'.`,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof UserNotFoundException) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: error.message || 'Không thể cập nhật trạng thái người dùng.',
      });
    }
  }

  /**
   * POST /api/v1/support/users/:userId/adjust-reputation
   * Trừ hoặc cộng điểm uy tín người dùng kèm lý do vi phạm (SRS 2.7, Support Staff Task 4)
   * Role: SUPPORT_STAFF, ADMIN
   */
  public async adjustReputation(req: Request, res: Response): Promise<void> {
    try {
      if (!this.adjustUserReputationUseCase) {
        res.status(500).json({
          success: false,
          error: 'AdjustUserReputationUseCase chưa được cấu hình.',
        });
        return;
      }

      const rawId = req.params.userId || req.params.id;
      const userId = Array.isArray(rawId) ? rawId[0] : String(rawId);
      const points =
        typeof req.body.points === 'number' ? req.body.points : Number(req.body.points);
      const reason = req.body.reason;
      const internalNote =
        typeof req.body.internalNote === 'string' ? req.body.internalNote : undefined;
      const operatorId = this.getAuthenticatedUserId(req) || 'system';
      const operatorRole = String((req as any).user?.role || 'ADMIN').toUpperCase();

      const result = await this.adjustUserReputationUseCase.execute({
        userId,
        points,
        reason,
        internalNote,
        operatorId,
        operatorRole,
      });

      res.status(200).json({
        success: true,
        message: `Đã điều chỉnh ${result.appliedDelta > 0 ? '+' : ''}${result.appliedDelta} điểm uy tín cho người dùng ${userId}.`,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof UserNotFoundException) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: error.message || 'Không thể điều chỉnh điểm uy tín.',
      });
    }
  }

  /**
   * POST /api/v1/support/users/:userId/restrict-features
   * Tạm khóa tính năng cụ thể (BAN_AUCTION_CREATION, BAN_BIDDING, BAN_PRODUCT_LISTING...)
   * Role: SUPPORT_STAFF, ADMIN
   */
  public async restrictFeatures(req: Request, res: Response): Promise<void> {
    try {
      if (!this.restrictUserFeaturesUseCase) {
        res.status(500).json({
          success: false,
          error: 'RestrictUserFeaturesUseCase chưa được cấu hình.',
        });
        return;
      }

      const rawId = req.params.userId || req.params.id;
      const userId = Array.isArray(rawId) ? rawId[0] : String(rawId);
      const restriction = req.body.restriction;
      const durationDays = Number(req.body.durationDays);
      const reason = req.body.reason;
      const operatorId = this.getAuthenticatedUserId(req) || 'system';

      const result = await this.restrictUserFeaturesUseCase.execute({
        userId,
        restriction,
        durationDays,
        reason,
        operatorId,
      });

      res.status(200).json({
        success: true,
        message: `Đã kích hoạt chế tài ${restriction} (${durationDays} ngày) cho người dùng ${userId}.`,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof UserNotFoundException) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: error.message || 'Không thể áp dụng chế tài tính năng.',
      });
    }
  }

  /**
   * GET /api/v1/users/me/reputation
   * Trả về điểm uy tín, hạng 5 bậc, quyền đặt giá (>= 40), nhiệm vụ và lịch sử (Mục 13 & 14)
   */
  public async getMyReputation(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.getAuthenticatedUserId(req);
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const user = this.userRepository ? await this.userRepository.findById(userId) : null;
      if (!user) {
        res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản.' });
        return;
      }

      await reputationLedgerStore.syncUserFromDb(user.id, user.reputationScore);
      const score = user.reputationScore;
      const tier = classifyReputationTier(score);
      const completedTransactions = reputationLedgerStore.getCompletedTransactions(user.id);
      const bidRestricted =
        user.isFeatureRestricted('BAN_BIDDING') ||
        user.isFeatureRestricted('AUCTION_BID') ||
        user.isFeatureRestricted('BIDDING_LOCK');
      const activeRestrictions = user.getActiveRestrictions();
      const bidRestrictionObj = activeRestrictions.find((r) =>
        ['BAN_BIDDING', 'AUCTION_BID', 'BIDDING_LOCK'].includes(r.restriction),
      );
      const minBidScore = Math.max(
        MIN_BID_REPUTATION_SCORE,
        getLiveSystemConfigValue('minReputationBid', MIN_BID_REPUTATION_SCORE),
      );
      const minAuctionScore = getLiveSystemConfigValue(
        'minReputationAuction',
        MIN_SELLER_AUCTION_REPUTATION_SCORE,
      );
      const canBid = user.status === 'ACTIVE' && !bidRestricted && score >= minBidScore;

      const history = reputationLedgerStore.getLedger(user.id).map((entry) => ({
        ...entry,
        internalNote: undefined,
      }));
      const missions = reputationLedgerStore.buildMissions(user.id, score, true);
      const appeals = reputationLedgerStore.listAppeals(user.id);

      res.status(200).json({
        success: true,
        data: {
          userId: user.id,
          score,
          reputationScore: score,
          tier: tier.code,
          trustLevel: tier.code,
          tierLabel: tier.label,
          nextTierLabel: tier.nextTierLabel ?? null,
          nextTierScore: tier.nextTierScore ?? null,
          pointsToNextTier: tier.nextTierScore ? Math.max(0, tier.nextTierScore - score) : 0,
          canBid,
          biddingEligible: user.role === 'BUYER' && canBid,
          minScoreRequiredToBid: minBidScore,
          pointsToBid: Math.max(0, minBidScore - score),
          canCreateSellerAuction: score >= minAuctionScore,
          accountStatus: user.status,
          isBidRestricted: bidRestricted,
          activeRestrictions: activeRestrictions.map((r) => ({
            feature: r.restriction === 'BAN_BIDDING' ? 'AUCTION_BID' : r.restriction,
            restriction: r.restriction,
            reason: r.reason,
            expiresAt: r.expiresAt,
          })),
          restrictionReason:
            bidRestrictionObj?.reason ||
            (score < MIN_BID_REPUTATION_SCORE
              ? `Uy tín dưới ngưỡng ${MIN_BID_REPUTATION_SCORE}/100 để đặt giá.`
              : null),
          completedTransactions,
          hasNoCompletedTransactions: completedTransactions === 0,
          version: reputationLedgerStore.getVersion(user.id),
          missions,
          recentHistory: history.slice(0, 10),
          history,
          appeals,
          stats: {
            completedOrders: completedTransactions,
            successRate: completedTransactions > 0 ? 100 : null,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể tải thông tin uy tín.',
      });
    }
  }

  /**
   * POST /api/v1/users/me/reputation/recovery-complete
   * Hoàn thành bài hướng dẫn phục hồi khi điểm < 40 (+3 điểm một lần suốt tài khoản - Mục 14)
   */
  public async completeRecoveryGuide(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.getAuthenticatedUserId(req);
      if (!userId || !this.userRepository) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const user = await this.userRepository.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản.' });
        return;
      }

      if (user.reputationScore >= MIN_BID_REPUTATION_SCORE) {
        res.status(400).json({
          success: false,
          error: 'Tài khoản của bạn đã đủ ngưỡng 50 điểm, không cần làm bài phục hồi.',
        });
        return;
      }

      await reputationLedgerStore.syncUserFromDb(user.id, user.reputationScore);
      const { entry, newScore, duplicate } = await reputationLedgerStore.recordEntryAsync({
        userId: user.id,
        currentScore: user.reputationScore,
        ruleCode: 'RECOVERY_GUIDE_COMPLETED',
        sourceType: 'SYSTEM',
        sourceId: `recovery:${user.id}`,
        requestedDelta: 3,
        reason: 'Hoàn thành hướng dẫn phục hồi quy tắc đấu giá',
        actorId: user.id,
        actorRole: 'BUYER',
      });

      if (duplicate) {
        res.status(409).json({
          success: false,
          error: 'Bạn đã nhận thưởng hướng dẫn phục hồi trước đó rồi.',
        });
        return;
      }

      const tier = classifyReputationTier(newScore);
      user.setReputationScore(newScore);
      if (this.userRepository.updateReputationScore) {
        await this.userRepository.updateReputationScore(user.id, newScore, tier.code);
      } else {
        await this.userRepository.update(user);
      }

      res.status(200).json({
        success: true,
        message: `Chúc mừng! Đã cộng +${entry.appliedDelta} điểm uy tín (Hiện tại: ${newScore}/100).`,
        data: {
          score: newScore,
          tier: tier.code,
          tierLabel: tier.label,
          canBid: newScore >= MIN_BID_REPUTATION_SCORE,
          entry,
        },
      });
    } catch (error: any) {
      res
        .status(400)
        .json({ success: false, error: error.message || 'Không thể hoàn thành bài phục hồi.' });
    }
  }

  /**
   * POST /api/v1/users/me/reputation/appeals
   * Buyer gửi yêu cầu xem lại một bút toán điểm (Mục 14)
   */
  public async submitReputationAppeal(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.getAuthenticatedUserId(req);
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const { ledgerEntryId, reason, evidenceNote } = req.body || {};
      if (!ledgerEntryId || typeof ledgerEntryId !== 'string') {
        res.status(400).json({ success: false, error: 'Thiếu mã bút toán cần xem lại.' });
        return;
      }
      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        res.status(400).json({ success: false, error: 'Vui lòng nhập lý do yêu cầu xem lại.' });
        return;
      }

      const targetUser = this.userRepository ? await this.userRepository.findById(userId) : null;
      await reputationLedgerStore.syncUserFromDb(userId, targetUser?.reputationScore ?? 50);
      const appeal = reputationLedgerStore.createAppeal({
        userId,
        ledgerEntryId,
        reason,
        evidenceNote,
      });
      await reputationLedgerStore.persistAppeal(appeal);

      res.status(201).json({
        success: true,
        message: 'Đã gửi yêu cầu xem lại bút toán điểm tới quản trị viên.',
        data: appeal,
      });
    } catch (error: any) {
      res
        .status(400)
        .json({ success: false, error: error.message || 'Không thể gửi yêu cầu xem lại.' });
    }
  }

  /**
   * GET /api/v1/users/admin/reputation/appeals
   */
  public async listReputationAppeals(req: Request, res: Response): Promise<void> {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    const appeals = await reputationLedgerStore.loadAppealsFromDb(userId);
    res.status(200).json({
      success: true,
      data: appeals,
    });
  }

  /**
   * POST /api/v1/users/admin/reputation/appeals/:appealId/resolve
   * Admin xử lý khiếu nại điểm: duyệt đảo bút toán (tính lại chuỗi U05) hoặc từ chối
   */
  public async resolveReputationAppeal(req: Request, res: Response): Promise<void> {
    try {
      const appealId = String(req.params.appealId || '');
      const { decision, resolutionNote } = req.body || {};
      const operatorId = this.getAuthenticatedUserId(req) || 'admin';

      const appeal = await reputationLedgerStore.findAppealByIdAsync(appealId);
      if (!appeal) {
        res.status(404).json({ success: false, error: 'Không tìm thấy yêu cầu xem lại.' });
        return;
      }
      if (appeal.status !== 'PENDING') {
        res.status(409).json({ success: false, error: 'Yêu cầu xem lại này đã được xử lý.' });
        return;
      }

      if (decision === 'APPROVE_REVERSE') {
        if (!this.userRepository) {
          res.status(500).json({ success: false, error: 'UserRepository not configured.' });
          return;
        }
        const user = await this.userRepository.findById(appeal.userId);
        if (!user) {
          res.status(404).json({ success: false, error: 'Không tìm thấy người dùng.' });
          return;
        }

        await reputationLedgerStore.syncUserFromDb(user.id, user.reputationScore);
        const { entry, newScore } = reputationLedgerStore.reverseEntryAndRecalculate({
          userId: user.id,
          currentScore: user.reputationScore,
          targetEntryId: appeal.ledgerEntryId,
          reason: resolutionNote || 'Quản trị viên chấp thuận đảo bút toán sau đối soát',
          actorId: operatorId,
          actorRole: 'ADMIN',
        });

        const tier = classifyReputationTier(newScore);
        user.setReputationScore(newScore);
        if (this.userRepository.updateReputationScore) {
          await this.userRepository.updateReputationScore(user.id, newScore, tier.code);
        } else {
          await this.userRepository.update(user);
        }

        appeal.status = 'APPROVED_REVERSED';
        appeal.resolutionNote = resolutionNote || 'Đã đảo bút toán và tính lại điểm.';
        appeal.resolvedBy = operatorId;
        appeal.resolvedAt = new Date().toISOString();
        appeal.compensationEntryId = entry.id;
        await reputationLedgerStore.persistAppeal(appeal);

        res.status(200).json({
          success: true,
          message: `Đã đảo bút toán và cập nhật điểm mới: ${newScore}/100.`,
          data: { appeal, entry, newScore },
        });
        return;
      }

      appeal.status = 'REJECTED';
      appeal.resolutionNote = resolutionNote || 'Giữ nguyên bút toán gốc theo đối soát.';
      appeal.resolvedBy = operatorId;
      appeal.resolvedAt = new Date().toISOString();
      await reputationLedgerStore.persistAppeal(appeal);

      res.status(200).json({
        success: true,
        message: 'Đã từ chối yêu cầu xem lại bút toán.',
        data: { appeal },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Không thể xử lý yêu cầu.' });
    }
  }

  /**
   * GET /api/v1/users/:id/reputation-history
   * Tra cứu hồ sơ & sổ điểm bất biến của 1 user (Admin/Support/chính chủ)
   */
  public async getReputationHistory(req: Request, res: Response): Promise<void> {
    try {
      const targetId = String(req.params.id || '');
      const authUser = (req as any).user;
      const requesterId = this.getAuthenticatedUserId(req);
      const role = String(authUser?.role || '').toUpperCase();

      if (requesterId !== targetId && role !== 'ADMIN' && role !== 'SUPPORT_STAFF') {
        res.status(403).json({
          success: false,
          error: 'Bạn không có quyền xem sổ điểm chi tiết của tài khoản khác.',
        });
        return;
      }

      const user = this.userRepository ? await this.userRepository.findById(targetId) : null;
      if (!user) {
        res.status(404).json({ success: false, error: `Không tìm thấy người dùng "${targetId}".` });
        return;
      }

      await reputationLedgerStore.syncUserFromDb(user.id, user.reputationScore);
      const score = user.reputationScore;
      const tier = classifyReputationTier(score);
      const canSeeInternal = role === 'ADMIN';
      const items = reputationLedgerStore
        .getLedger(user.id)
        .map((entry) => (canSeeInternal ? entry : { ...entry, internalNote: undefined }));
      const appeals = reputationLedgerStore.listAppeals(user.id);

      res.status(200).json({
        success: true,
        data: {
          userId: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          status: user.status,
          currentScore: score,
          reputationScore: score,
          tier: tier.code,
          tierLabel: tier.label,
          canBid: score >= MIN_BID_REPUTATION_SCORE && user.status === 'ACTIVE',
          completedTransactions: reputationLedgerStore.getCompletedTransactions(user.id),
          items,
          appeals,
          pagination: { page: 1, limit: items.length || 20, total: items.length },
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể tải lịch sử uy tín.',
      });
    }
  }

  /**
   * POST /api/v1/users/:id/reputation/events
   * Ghi nhận sự kiện cộng/trừ điểm có idempotency theo (userId, ruleCode, sourceId) (Mục 14 & U02/U04)
   */
  public async recordReputationEvent(req: Request, res: Response): Promise<void> {
    try {
      const targetId = String(req.params.id || '');
      const serviceAuth = (req as any).serviceAuth as { iss?: string } | undefined;
      const requesterId =
        this.getAuthenticatedUserId(req) ||
        (serviceAuth?.iss ? `svc:${serviceAuth.iss}` : 'system');
      const role = serviceAuth ? 'SYSTEM' : String((req as any).user?.role || '').toUpperCase();
      if (!serviceAuth && role !== 'ADMIN') {
        res.status(403).json({ success: false, error: 'Không có quyền ghi nhận sự kiện uy tín.' });
        return;
      }
      if (!this.userRepository) {
        res.status(500).json({ success: false, error: 'UserRepository not configured.' });
        return;
      }

      const user = await this.userRepository.findById(targetId);
      if (!user) {
        res.status(404).json({ success: false, error: 'Không tìm thấy người dùng.' });
        return;
      }

      const { ruleCode, sourceId, reason } = req.body || {};
      const DELTA_BY_RULE: Record<
        string,
        { delta: number; sourceType: any; defaultReason: string }
      > = {
        ACCOUNT_VERIFIED: {
          delta: 2,
          sourceType: 'SYSTEM',
          defaultReason: 'Xác minh tài khoản thành công',
        },
        AUCTION_PAID_ON_TIME: {
          delta: 2,
          sourceType: 'AUCTION',
          defaultReason: 'Thanh toán đúng hạn đơn trúng đấu giá',
        },
        ORDER_COMPLETED: {
          delta: 3,
          sourceType: 'ORDER',
          defaultReason: 'Hoàn tất giao dịch mua hàng',
        },
        POSITIVE_REVIEW: {
          delta: 1,
          sourceType: 'REVIEW',
          defaultReason: 'Nhận đánh giá tích cực từ đối tác',
        },
        AUCTION_PAYMENT_TIMEOUT: {
          delta: -10,
          sourceType: 'AUCTION',
          defaultReason: 'Quá hạn thanh toán đơn trúng đấu giá',
        },
      };

      const rule = DELTA_BY_RULE[String(ruleCode || '')];
      if (!rule || !sourceId) {
        res.status(400).json({ success: false, error: 'ruleCode hoặc sourceId không hợp lệ.' });
        return;
      }

      await reputationLedgerStore.syncUserFromDb(user.id, user.reputationScore);
      const { entry, newScore, duplicate } = await reputationLedgerStore.recordEntryAsync({
        userId: user.id,
        currentScore: user.reputationScore,
        ruleCode: ruleCode as ReputationRuleCode,
        sourceType: rule.sourceType,
        sourceId: String(sourceId),
        requestedDelta: rule.delta,
        reason: typeof reason === 'string' && reason.trim() ? reason : rule.defaultReason,
        actorId: requesterId,
        actorRole: role || 'SYSTEM',
      });

      if (!duplicate) {
        user.setReputationScore(newScore);
      }

      res.status(200).json({
        success: true,
        duplicate,
        data: { score: newScore, entry },
      });
    } catch (error: any) {
      res
        .status(400)
        .json({ success: false, error: error.message || 'Không thể ghi nhận sự kiện uy tín.' });
    }
  }
}
