import { randomUUID } from 'node:crypto';
import {
  SellerApplication,
  SellerApplicationAdminDto,
  SellerApplicationBuyerDto,
  SellerApplicationShopSnapshot,
  SellerApplicationStatus,
} from '../../domain/entities/SellerApplication';
import { User, UserRole } from '../../domain/entities/User';
import {
  SellerActivationBlockedException,
  SellerApplicationConflictException,
  SellerApplicationForbiddenException,
  SellerApplicationNotFoundException,
  SellerApplicationValidationException,
} from '../../domain/exceptions/SellerApplicationExceptions';
import {
  ISellerApplicationRepository,
  SellerApplicationSearchCriteria,
  SellerApplicationSearchPage,
} from '../../domain/repositories/ISellerApplicationRepository';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import {
  ISellerEligibilityChecker,
  SellerEligibilityBlocker,
} from '../ports/ISellerEligibilityChecker';

export interface SellerActivationSessionResult {
  accessToken: string;
  refreshToken: string;
  permissions: string[];
}

export interface ISellerNotificationSender {
  notifyApplicationEvent(params: {
    recipientEmail: string;
    recipientName: string;
    applicationId: string;
    event: 'SUBMITTED' | 'RESUBMITTED' | 'APPROVED' | 'REJECTED' | 'APPROVAL_REVOKED' | 'ACTIVATED';
    shopName: string;
    reason?: string;
  }): Promise<void>;
}

const VN_PHONE_REGEX = /^(?:0|\+84)\d{9}$/;

export function validateAndSanitizeShopSnapshot(
  rawInput: unknown,
  accountEmail: string,
  accountFullName: string,
): SellerApplicationShopSnapshot {
  const body =
    rawInput && typeof rawInput === 'object' && !Array.isArray(rawInput)
      ? (rawInput as Record<string, unknown>)
      : {};

  const fieldErrors: Record<string, string> = {};

  const shopName = typeof body.shopName === 'string' ? body.shopName.trim() : '';
  if (!shopName) {
    fieldErrors.shopName = 'Tên cửa hàng là bắt buộc.';
  } else if (shopName.length < 3 || shopName.length > 80) {
    fieldErrors.shopName = 'Tên cửa hàng cần từ 3 đến 80 ký tự.';
  }

  const contactName =
    typeof body.contactName === 'string' && body.contactName.trim()
      ? body.contactName.trim()
      : accountFullName.trim();
  if (!contactName || contactName.length < 2 || contactName.length > 100) {
    fieldErrors.contactName = 'Tên người liên hệ cần từ 2 đến 100 ký tự.';
  }

  const rawPhone = typeof body.contactPhone === 'string' ? body.contactPhone.trim() : '';
  const normalizedPhone = rawPhone.replace(/[\s.-]/g, '');
  if (!normalizedPhone) {
    fieldErrors.contactPhone = 'Số điện thoại liên hệ là bắt buộc.';
  } else if (!VN_PHONE_REGEX.test(normalizedPhone)) {
    fieldErrors.contactPhone =
      'Số điện thoại liên hệ cần đúng định dạng Việt Nam (10 chữ số bắt đầu bằng 0 hoặc +84).';
  }

  // Địa chỉ lấy hàng
  const rawAddress =
    body.pickupAddress &&
    typeof body.pickupAddress === 'object' &&
    !Array.isArray(body.pickupAddress)
      ? (body.pickupAddress as Record<string, unknown>)
      : {};

  const provinceCode =
    typeof rawAddress.provinceCode === 'string' ? rawAddress.provinceCode.trim() : '';
  const provinceName =
    typeof rawAddress.provinceName === 'string' ? rawAddress.provinceName.trim() : '';
  const wardCode = typeof rawAddress.wardCode === 'string' ? rawAddress.wardCode.trim() : '';
  const wardName = typeof rawAddress.wardName === 'string' ? rawAddress.wardName.trim() : '';
  const street = typeof rawAddress.street === 'string' ? rawAddress.street.trim() : '';
  const note = typeof rawAddress.note === 'string' ? rawAddress.note.trim() : undefined;

  if (!provinceCode || !provinceName) {
    fieldErrors.provinceCode = 'Vui lòng chọn Tỉnh/Thành phố lấy hàng.';
  }
  if (!wardCode || !wardName) {
    fieldErrors.wardCode = 'Vui lòng chọn Phường/Xã lấy hàng.';
  }
  if (!street || street.length < 5 || street.length > 180) {
    fieldErrors.street = 'Địa chỉ cụ thể cần từ 5 đến 180 ký tự.';
  }

  // Nhóm hàng dự kiến bán
  const rawCategoryIds = Array.isArray(body.categoryIds) ? body.categoryIds : [];
  const categoryIds = Array.from(
    new Set(
      rawCategoryIds
        .map((id) => (typeof id === 'string' || typeof id === 'number' ? String(id).trim() : ''))
        .filter(Boolean),
    ),
  );
  const rawCategoryNames = Array.isArray(body.categoryNames) ? body.categoryNames : [];
  const categoryNames = rawCategoryNames
    .map((name) => (typeof name === 'string' ? name.trim() : ''))
    .filter(Boolean);

  if (categoryIds.length === 0) {
    fieldErrors.categoryIds = 'Vui lòng chọn ít nhất 1 danh mục sản phẩm dự kiến kinh doanh.';
  } else if (categoryIds.length > 10) {
    fieldErrors.categoryIds = 'Tối đa chọn 10 danh mục sản phẩm dự kiến kinh doanh.';
  }

  const shopDescription =
    typeof body.shopDescription === 'string' ? body.shopDescription.trim() : '';
  if (shopDescription.length > 1000) {
    fieldErrors.shopDescription = 'Giới thiệu cửa hàng không vượt quá 1000 ký tự.';
  }

  const acceptedTerms = body.acceptedTerms === true;
  if (!acceptedTerms) {
    fieldErrors.acceptedTerms =
      'Bạn cần xác nhận đồng ý điều kiện chuyển đổi sang tài khoản Seller (bao gồm việc ngưng quyền mua hàng/đấu giá sau khi kích hoạt).';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new SellerApplicationValidationException(
      'Thông tin hồ sơ đăng ký bán hàng chưa hợp lệ. Vui lòng kiểm tra lại các trường đánh dấu.',
      fieldErrors,
    );
  }

  return {
    shopName,
    contactName,
    contactPhone: normalizedPhone,
    // Email liên hệ luôn lấy từ tài khoản đã xác thực trên BE, không cho client giả mạo
    contactEmail: accountEmail,
    emailVerified: true,
    pickupAddress: {
      provinceCode,
      provinceName,
      wardCode,
      wardName,
      street,
      ...(note ? { note: note.slice(0, 180) } : {}),
    },
    categoryIds,
    categoryNames: categoryNames.length > 0 ? categoryNames : categoryIds,
    ...(shopDescription ? { shopDescription } : {}),
    acceptedTerms: true,
  };
}

export class SellerApplicationService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly applicationRepository: ISellerApplicationRepository,
    private readonly eligibilityChecker: ISellerEligibilityChecker,
    private readonly onRoleActivated: (user: User) => SellerActivationSessionResult,
    private readonly notificationSender?: ISellerNotificationSender,
  ) {}

  private async safeNotify(
    params: Parameters<ISellerNotificationSender['notifyApplicationEvent']>[0],
  ): Promise<void> {
    if (!this.notificationSender) return;
    try {
      await this.notificationSender.notifyApplicationEvent(params);
    } catch {
      // Lỗi gửi thông báo không được phép làm hỏng hoặc chạy lại thao tác nghiệp vụ đã commit
    }
  }

  private async requireValidUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new SellerApplicationForbiddenException('Không tìm thấy tài khoản người dùng.');
    }
    if (!user.isActive()) {
      throw new SellerApplicationForbiddenException(
        'Tài khoản của bạn hiện không ở trạng thái hoạt động (ACTIVE).',
      );
    }
    return user;
  }

  private async requireApplicationForOwner(
    applicationId: string,
    userId: string,
  ): Promise<SellerApplication> {
    const app = await this.applicationRepository.findById(applicationId);
    if (!app) {
      throw new SellerApplicationNotFoundException();
    }
    if (app.applicantId !== userId) {
      // Không tiết lộ dữ liệu hồ sơ của người khác
      throw new SellerApplicationForbiddenException(
        'Bạn không có quyền xem hoặc thao tác trên hồ sơ đăng ký bán hàng của tài khoản khác.',
      );
    }
    return app;
  }

  /**
   * 1. GET /seller-applications/me
   */
  public async getMyApplication(userId: string): Promise<{
    application: SellerApplicationBuyerDto | null;
    accountRole: string;
    accountEmail: string;
    accountFullName: string;
    accountPhone: string;
    emailVerified: boolean;
    allowedActions: string[];
  }> {
    const user = await this.requireValidUser(userId);
    const latest = await this.applicationRepository.findLatestByApplicantId(user.id);

    if (!latest) {
      return {
        application: null,
        accountRole: user.role,
        accountEmail: user.email,
        accountFullName: user.fullName,
        accountPhone: user.phone || '',
        emailVerified: true,
        allowedActions: user.role === UserRole.BUYER ? ['SUBMIT'] : [],
      };
    }

    const dto = latest.toBuyerDto(user.role);
    return {
      application: dto,
      accountRole: user.role,
      accountEmail: user.email,
      accountFullName: user.fullName,
      accountPhone: user.phone || '',
      emailVerified: true,
      allowedActions: dto.allowedActions,
    };
  }

  /**
   * 2. POST /seller-applications
   */
  public async submitApplication(
    userId: string,
    rawBody: unknown,
    idempotencyKey?: string,
  ): Promise<SellerApplicationBuyerDto> {
    const idemKey = idempotencyKey?.trim()
      ? `submit:${userId}:${idempotencyKey.trim()}`
      : undefined;
    if (idemKey) {
      const cached =
        await this.applicationRepository.getIdempotentResult<SellerApplicationBuyerDto>(idemKey);
      if (cached) return cached;
    }

    const user = await this.requireValidUser(userId);
    if (user.role !== UserRole.BUYER) {
      throw new SellerApplicationForbiddenException(
        user.role === UserRole.SELLER
          ? 'Tài khoản của bạn đã là Người bán (Seller).'
          : 'Chỉ tài khoản Người mua (Buyer) mới được gửi hồ sơ đăng ký bán hàng.',
      );
    }

    const existing = await this.applicationRepository.findLatestByApplicantId(user.id);
    if (existing) {
      if (
        existing.status === SellerApplicationStatus.PENDING ||
        existing.status === SellerApplicationStatus.APPROVED
      ) {
        throw new SellerApplicationConflictException(
          'Bạn đã có một hồ sơ đăng ký bán hàng đang chờ xét duyệt hoặc chờ kích hoạt. Không thể tạo hồ sơ trùng.',
          'DUPLICATE_ACTIVE_APPLICATION',
          { applicationId: existing.id, status: existing.status, version: existing.version },
        );
      }
      if (existing.status === SellerApplicationStatus.ACTIVATED) {
        throw new SellerApplicationConflictException(
          'Hồ sơ của bạn đã được kích hoạt Seller.',
          'INVALID_STATUS_TRANSITION',
          { applicationId: existing.id, status: existing.status },
        );
      }
      // Nếu hồ sơ cũ đang ở REJECTED hoặc WITHDRAWN, chuyển sang tạo phiên bản mới trên cùng hồ sơ để giữ nguyên lịch sử
      return this.resubmitApplication(
        userId,
        existing.id,
        rawBody,
        existing.version,
        idempotencyKey,
      );
    }

    const snapshot = validateAndSanitizeShopSnapshot(rawBody, user.email, user.fullName);
    const now = new Date();
    const appId = `sapp_${now.getTime().toString(36)}_${randomUUID().slice(0, 8)}`;
    const decisionId = `sdec_${randomUUID().slice(0, 12)}`;

    const app = new SellerApplication({
      id: appId,
      applicantId: user.id,
      applicantName: user.fullName,
      applicantEmail: user.email,
      status: SellerApplicationStatus.PENDING,
      version: 1,
      snapshot,
      rejectionReason: null,
      submittedAt: now,
      reviewedAt: null,
      reviewedBy: null,
      activatedAt: null,
      versions: [
        {
          version: 1,
          submittedAt: now.toISOString(),
          snapshot,
        },
      ],
      decisionHistory: [
        {
          id: decisionId,
          version: 1,
          action: 'SUBMITTED',
          fromStatus: 'NONE',
          toStatus: SellerApplicationStatus.PENDING,
          actorId: user.id,
          actorRole: 'BUYER',
          actorName: user.fullName,
          publicReason: 'Gửi hồ sơ đăng ký bán hàng lần đầu (v1).',
          occurredAt: now.toISOString(),
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    await this.applicationRepository.save(app);

    const dto = app.toBuyerDto(user.role);
    if (idemKey) {
      await this.applicationRepository.saveIdempotentResult(idemKey, dto);
    }

    await this.safeNotify({
      recipientEmail: user.email,
      recipientName: user.fullName,
      applicationId: app.id,
      event: 'SUBMITTED',
      shopName: snapshot.shopName,
    });

    return dto;
  }

  /**
   * 3. POST /seller-applications/:id/resubmit
   */
  public async resubmitApplication(
    userId: string,
    applicationId: string,
    rawBody: unknown,
    expectedVersion?: number,
    idempotencyKey?: string,
  ): Promise<SellerApplicationBuyerDto> {
    const idemKey = idempotencyKey?.trim()
      ? `resubmit:${userId}:${applicationId}:${idempotencyKey.trim()}`
      : undefined;
    if (idemKey) {
      const cached =
        await this.applicationRepository.getIdempotentResult<SellerApplicationBuyerDto>(idemKey);
      if (cached) return cached;
    }

    const user = await this.requireValidUser(userId);
    if (user.role !== UserRole.BUYER) {
      throw new SellerApplicationForbiddenException(
        'Chỉ tài khoản Buyer mới được phép chỉnh sửa và gửi lại hồ sơ đăng ký bán hàng.',
      );
    }

    const app = await this.requireApplicationForOwner(applicationId, user.id);
    const prevVersion = app.version;
    const snapshot = validateAndSanitizeShopSnapshot(rawBody, user.email, user.fullName);

    app.resubmit({
      actorId: user.id,
      actorName: user.fullName,
      expectedVersion: expectedVersion ?? prevVersion,
      snapshot,
      decisionId: `sdec_${randomUUID().slice(0, 12)}`,
    });

    const updated = await this.applicationRepository.updateWithVersion(app, prevVersion);
    if (!updated) {
      throw new SellerApplicationConflictException(
        'Hồ sơ đã bị thay đổi bởi thao tác khác. Vui lòng tải lại trạng thái mới nhất.',
        'VERSION_CONFLICT',
      );
    }

    const dto = app.toBuyerDto(user.role);
    if (idemKey) {
      await this.applicationRepository.saveIdempotentResult(idemKey, dto);
    }

    await this.safeNotify({
      recipientEmail: user.email,
      recipientName: user.fullName,
      applicationId: app.id,
      event: 'RESUBMITTED',
      shopName: snapshot.shopName,
    });

    return dto;
  }

  /**
   * 4. POST /seller-applications/:id/withdraw
   */
  public async withdrawApplication(
    userId: string,
    applicationId: string,
    expectedVersion?: number,
    reason?: string,
  ): Promise<SellerApplicationBuyerDto> {
    const user = await this.requireValidUser(userId);
    const app = await this.requireApplicationForOwner(applicationId, user.id);
    const prevVersion = app.version;

    app.withdraw({
      actorId: user.id,
      actorName: user.fullName,
      expectedVersion,
      reason,
      decisionId: `sdec_${randomUUID().slice(0, 12)}`,
    });

    const updated = await this.applicationRepository.updateWithVersion(app, prevVersion);
    if (!updated) {
      throw new SellerApplicationConflictException(
        'Trạng thái hồ sơ vừa thay đổi (có thể Admin vừa xử lý). Vui lòng tải lại trang.',
        'VERSION_CONFLICT',
      );
    }

    return app.toBuyerDto(user.role);
  }

  /**
   * 5. GET /seller-applications/:id/activation-eligibility
   */
  public async checkActivationEligibility(
    userId: string,
    applicationId: string,
    options?: { authHeader?: string; simulateUnavailable?: boolean },
  ): Promise<{
    applicationId: string;
    status: SellerApplicationStatus;
    version: number;
    eligible: boolean;
    serviceAvailable: boolean;
    blockers: SellerEligibilityBlocker[];
    checkedAt: string;
  }> {
    const user = await this.requireValidUser(userId);
    const app = await this.requireApplicationForOwner(applicationId, user.id);
    const checkedAt = new Date().toISOString();
    const blockers: SellerEligibilityBlocker[] = [];

    if (!user.isActive() || user.role !== UserRole.BUYER) {
      blockers.push({
        code: 'ACCOUNT_NOT_ACTIVE_BUYER',
        message:
          user.role === UserRole.SELLER
            ? 'Tài khoản của bạn đã được chuyển sang vai trò Seller.'
            : 'Tài khoản hiện không ở trạng thái Buyer hoạt động hợp lệ.',
        referenceType: 'ACCOUNT',
      });
    }

    if (app.status !== SellerApplicationStatus.APPROVED) {
      blockers.push({
        code: 'APPLICATION_NOT_APPROVED',
        message: `Hồ sơ hiện ở trạng thái ${app.status}, cần ở trạng thái Đã phê duyệt (APPROVED) để kích hoạt.`,
        referenceType: 'ACCOUNT',
      });
    }

    const obligationResult = await this.eligibilityChecker.checkObligations(user.id, options);
    blockers.push(...obligationResult.blockers);

    return {
      applicationId: app.id,
      status: app.status,
      version: app.version,
      eligible: obligationResult.serviceAvailable && blockers.length === 0,
      serviceAvailable: obligationResult.serviceAvailable,
      blockers,
      checkedAt: obligationResult.checkedAt || checkedAt,
    };
  }

  /**
   * 6. POST /seller-applications/:id/activate
   * Kiểm tra lại toàn bộ nghĩa vụ trong cửa sổ khóa chuyển đổi (Activation Lock),
   * đổi role Buyer -> Seller, thu hồi token Buyer cũ và phát hành session mới.
   */
  public async activateSeller(
    userId: string,
    applicationId: string,
    params?: {
      expectedVersion?: number;
      idempotencyKey?: string;
      authHeader?: string;
      simulateUnavailable?: boolean;
    },
  ): Promise<{
    application: SellerApplicationBuyerDto;
    user: {
      id: string;
      email: string;
      fullName: string;
      phone: string;
      role: string;
      status: string;
      reputationScore: number;
      permissions: string[];
    };
    accessToken: string;
    token: string;
    refreshToken: string;
  }> {
    const idemKey = params?.idempotencyKey?.trim()
      ? `activate:${userId}:${applicationId}:${params.idempotencyKey.trim()}`
      : undefined;
    if (idemKey) {
      const cached = await this.applicationRepository.getIdempotentResult<any>(idemKey);
      if (cached) return cached;
    }

    const initialUser = await this.requireValidUser(userId);
    const initialApp = await this.requireApplicationForOwner(applicationId, initialUser.id);

    // Xử lý Idempotent khi request trước đã kích hoạt thành công nhưng client bị timeout và gọi lại
    if (
      initialApp.status === SellerApplicationStatus.ACTIVATED &&
      initialUser.role === UserRole.SELLER
    ) {
      const sessionTokens = this.onRoleActivated(initialUser);
      const idempotentResult = {
        application: initialApp.toBuyerDto(initialUser.role),
        user: {
          id: initialUser.id,
          email: initialUser.email,
          fullName: initialUser.fullName,
          phone: initialUser.phone,
          role: initialUser.role,
          status: initialUser.status,
          reputationScore: initialUser.reputationScore,
          permissions: sessionTokens.permissions,
        },
        accessToken: sessionTokens.accessToken,
        token: sessionTokens.accessToken,
        refreshToken: sessionTokens.refreshToken,
      };
      if (idemKey) {
        await this.applicationRepository.saveIdempotentResult(idemKey, idempotentResult);
      }
      return idempotentResult;
    }

    // Khóa cửa sổ chuyển đổi (ngăn Buyer đồng thời tạo checkout/bid mới hoặc kích hoạt kép)
    const acquired = await this.applicationRepository.acquireActivationLock(initialUser.id, 15000);
    if (!acquired) {
      throw new SellerApplicationConflictException(
        'Yêu cầu kích hoạt Seller đang được xử lý. Vui lòng không thao tác lặp lại.',
        'ACTIVATION_IN_PROGRESS',
      );
    }

    try {
      // Đọc lại bản ghi mới nhất bên trong cửa sổ khóa để chống TOCTOU
      const user = await this.requireValidUser(userId);
      const app = await this.requireApplicationForOwner(applicationId, user.id);

      if (app.status === SellerApplicationStatus.ACTIVATED && user.role === UserRole.SELLER) {
        const sessionTokens = this.onRoleActivated(user);
        return {
          application: app.toBuyerDto(user.role),
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone,
            role: user.role,
            status: user.status,
            reputationScore: user.reputationScore,
            permissions: sessionTokens.permissions,
          },
          accessToken: sessionTokens.accessToken,
          token: sessionTokens.accessToken,
          refreshToken: sessionTokens.refreshToken,
        };
      }

      if (user.role !== UserRole.BUYER) {
        throw new SellerApplicationForbiddenException(
          `Tài khoản hiện có vai trò ${user.role}, không thể thực hiện kích hoạt từ Buyer.`,
        );
      }

      if (app.status !== SellerApplicationStatus.APPROVED) {
        throw new SellerApplicationConflictException(
          `Hồ sơ hiện ở trạng thái ${app.status}, không thể kích hoạt Seller.`,
          'INVALID_STATUS_TRANSITION',
          { currentStatus: app.status, currentVersion: app.version },
        );
      }

      if (params?.expectedVersion !== undefined && Number(params.expectedVersion) !== app.version) {
        throw new SellerApplicationConflictException(
          'Phiên bản hồ sơ đã thay đổi. Vui lòng tải lại trước khi kích hoạt.',
          'VERSION_CONFLICT',
          { currentStatus: app.status, currentVersion: app.version },
        );
      }

      // Kiểm tra lại toàn bộ nghĩa vụ bên trong cửa sổ khóa
      const eligibility = await this.eligibilityChecker.checkObligations(user.id, {
        authHeader: params?.authHeader,
        simulateUnavailable: params?.simulateUnavailable,
      });

      if (!eligibility.serviceAvailable) {
        throw new SellerActivationBlockedException(
          'Chưa kiểm tra được điều kiện nghĩa vụ từ dịch vụ Đơn hàng / Đấu giá. Vui lòng thử lại sau.',
          'OBLIGATION_SERVICE_UNAVAILABLE',
          {
            eligible: false,
            serviceAvailable: false,
            blockers: eligibility.blockers,
            checkedAt: eligibility.checkedAt,
          },
        );
      }

      if (!eligibility.eligible || eligibility.blockers.length > 0) {
        throw new SellerActivationBlockedException(
          'Tài khoản còn nghĩa vụ giao dịch đang mở chưa hoàn tất. Vui lòng xử lý các mục bên dưới trước khi kích hoạt Seller.',
          'ACTIVATION_BLOCKED',
          {
            eligible: false,
            serviceAvailable: true,
            blockers: eligibility.blockers,
            checkedAt: eligibility.checkedAt,
          },
        );
      }

      // Giải phóng checkout reservation đang giữ (nếu có) trước khi đổi role
      if (this.eligibilityChecker.releaseOpenCheckoutReservations) {
        await this.eligibilityChecker.releaseOpenCheckoutReservations(user.id, params?.authHeader);
      }

      const prevVersion = app.version;
      app.activate({
        actorId: user.id,
        actorName: user.fullName,
        expectedVersion: prevVersion,
        decisionId: `sdec_${randomUUID().slice(0, 12)}`,
      });

      const updatedApp = await this.applicationRepository.updateWithVersion(app, prevVersion);
      if (!updatedApp) {
        throw new SellerApplicationConflictException(
          'Trạng thái hồ sơ vừa thay đổi trong lúc kích hoạt. Vui lòng tải lại.',
          'VERSION_CONFLICT',
        );
      }

      user.setRole(UserRole.SELLER);
      await this.userRepository.update(user);

      // Thu hồi toàn bộ token Buyer cũ và sinh token Seller mới
      const sessionTokens = this.onRoleActivated(user);

      const result = {
        application: app.toBuyerDto(user.role),
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
          status: user.status,
          reputationScore: user.reputationScore,
          permissions: sessionTokens.permissions,
        },
        accessToken: sessionTokens.accessToken,
        token: sessionTokens.accessToken,
        refreshToken: sessionTokens.refreshToken,
      };

      if (idemKey) {
        await this.applicationRepository.saveIdempotentResult(idemKey, result);
      }

      await this.safeNotify({
        recipientEmail: user.email,
        recipientName: user.fullName,
        applicationId: app.id,
        event: 'ACTIVATED',
        shopName: app.snapshot.shopName,
      });

      return result;
    } finally {
      await this.applicationRepository.releaseActivationLock(initialUser.id);
    }
  }

  /**
   * 7. GET /admin/seller-applications
   */
  public async listAdminApplications(criteria: SellerApplicationSearchCriteria): Promise<{
    items: SellerApplicationAdminDto[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    summary: SellerApplicationSearchPage['summary'];
  }> {
    const pageResult = await this.applicationRepository.search(criteria);
    const items = await Promise.all(
      pageResult.applications.map(async (app) => {
        const applicantUser = await this.userRepository.findById(app.applicantId);
        return app.toAdminDto(
          applicantUser
            ? {
                id: applicantUser.id,
                fullName: applicantUser.fullName,
                email: applicantUser.email,
                phone: applicantUser.phone,
                role: applicantUser.role,
                status: applicantUser.status,
                reputationScore: applicantUser.reputationScore,
                createdAt: applicantUser.createdAt.toISOString(),
              }
            : undefined,
        );
      }),
    );

    return {
      items,
      pagination: {
        total: pageResult.total,
        page: pageResult.page,
        limit: pageResult.limit,
        totalPages: pageResult.totalPages,
      },
      summary: pageResult.summary,
    };
  }

  /**
   * 8. GET /admin/seller-applications/:id
   */
  public async getAdminApplicationDetail(
    applicationId: string,
  ): Promise<SellerApplicationAdminDto> {
    const app = await this.applicationRepository.findById(applicationId);
    if (!app) {
      throw new SellerApplicationNotFoundException();
    }
    const applicantUser = await this.userRepository.findById(app.applicantId);
    return app.toAdminDto(
      applicantUser
        ? {
            id: applicantUser.id,
            fullName: applicantUser.fullName,
            email: applicantUser.email,
            phone: applicantUser.phone,
            role: applicantUser.role,
            status: applicantUser.status,
            reputationScore: applicantUser.reputationScore,
            createdAt: applicantUser.createdAt.toISOString(),
          }
        : undefined,
    );
  }

  /**
   * 9. POST /admin/seller-applications/:id/approve
   * Chỉ phê duyệt hồ sơ (APPROVED), tuyệt đối CHƯA đổi role sang SELLER ở bước này!
   */
  public async approveApplication(params: {
    applicationId: string;
    adminId: string;
    expectedVersion?: number;
    internalNote?: string;
  }): Promise<SellerApplicationAdminDto> {
    const admin = await this.requireValidUser(params.adminId);
    const app = await this.applicationRepository.findById(params.applicationId);
    if (!app) {
      throw new SellerApplicationNotFoundException();
    }

    const prevVersion = app.version;
    app.approve({
      actorId: admin.id,
      actorName: admin.fullName,
      expectedVersion: params.expectedVersion,
      internalNote: params.internalNote,
      decisionId: `sdec_${randomUUID().slice(0, 12)}`,
    });

    const updated = await this.applicationRepository.updateWithVersion(app, prevVersion);
    if (!updated) {
      const latest = await this.applicationRepository.findById(params.applicationId);
      throw new SellerApplicationConflictException(
        'Hồ sơ đã được một Quản trị viên khác xử lý hoặc thay đổi phiên bản. Vui lòng tải lại.',
        'VERSION_CONFLICT',
        latest ? { currentStatus: latest.status, currentVersion: latest.version } : undefined,
      );
    }

    await this.safeNotify({
      recipientEmail: app.applicantEmail,
      recipientName: app.applicantName,
      applicationId: app.id,
      event: 'APPROVED',
      shopName: app.snapshot.shopName,
    });

    return this.getAdminApplicationDetail(app.id);
  }

  /**
   * 10. POST /admin/seller-applications/:id/reject
   */
  public async rejectApplication(params: {
    applicationId: string;
    adminId: string;
    expectedVersion?: number;
    reason: string;
    internalNote?: string;
  }): Promise<SellerApplicationAdminDto> {
    const admin = await this.requireValidUser(params.adminId);
    const app = await this.applicationRepository.findById(params.applicationId);
    if (!app) {
      throw new SellerApplicationNotFoundException();
    }

    const prevVersion = app.version;
    app.reject({
      actorId: admin.id,
      actorName: admin.fullName,
      expectedVersion: params.expectedVersion,
      publicReason: params.reason,
      internalNote: params.internalNote,
      decisionId: `sdec_${randomUUID().slice(0, 12)}`,
    });

    const updated = await this.applicationRepository.updateWithVersion(app, prevVersion);
    if (!updated) {
      const latest = await this.applicationRepository.findById(params.applicationId);
      throw new SellerApplicationConflictException(
        'Hồ sơ đã được một Quản trị viên khác xử lý hoặc thay đổi phiên bản. Vui lòng tải lại.',
        'VERSION_CONFLICT',
        latest ? { currentStatus: latest.status, currentVersion: latest.version } : undefined,
      );
    }

    await this.safeNotify({
      recipientEmail: app.applicantEmail,
      recipientName: app.applicantName,
      applicationId: app.id,
      event: 'REJECTED',
      shopName: app.snapshot.shopName,
      reason: params.reason,
    });

    return this.getAdminApplicationDetail(app.id);
  }

  /**
   * 11. POST /admin/seller-applications/:id/revoke-approval
   */
  public async revokeApproval(params: {
    applicationId: string;
    adminId: string;
    expectedVersion?: number;
    reason: string;
    internalNote?: string;
  }): Promise<SellerApplicationAdminDto> {
    const admin = await this.requireValidUser(params.adminId);
    const app = await this.applicationRepository.findById(params.applicationId);
    if (!app) {
      throw new SellerApplicationNotFoundException();
    }

    const prevVersion = app.version;
    app.revokeApproval({
      actorId: admin.id,
      actorName: admin.fullName,
      expectedVersion: params.expectedVersion,
      publicReason: params.reason,
      internalNote: params.internalNote,
      decisionId: `sdec_${randomUUID().slice(0, 12)}`,
    });

    const updated = await this.applicationRepository.updateWithVersion(app, prevVersion);
    if (!updated) {
      const latest = await this.applicationRepository.findById(params.applicationId);
      throw new SellerApplicationConflictException(
        'Trạng thái hồ sơ đã thay đổi (có thể người dùng vừa kích hoạt hoặc rút hồ sơ). Vui lòng tải lại.',
        'VERSION_CONFLICT',
        latest ? { currentStatus: latest.status, currentVersion: latest.version } : undefined,
      );
    }

    await this.safeNotify({
      recipientEmail: app.applicantEmail,
      recipientName: app.applicantName,
      applicationId: app.id,
      event: 'APPROVAL_REVOKED',
      shopName: app.snapshot.shopName,
      reason: params.reason,
    });

    return this.getAdminApplicationDetail(app.id);
  }

  public async isUserInActivationWindow(userId: string): Promise<boolean> {
    return this.applicationRepository.isInActivationWindow(userId);
  }
}
