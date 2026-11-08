import {
  SellerApplicationConflictException,
  SellerApplicationValidationException,
} from '../exceptions/SellerApplicationExceptions';

export enum SellerApplicationStatus {
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  APPROVED = 'APPROVED',
  ACTIVATED = 'ACTIVATED',
}

export type BuyerAllowedAction =
  'SUBMIT' | 'WITHDRAW' | 'RESUBMIT' | 'CHECK_ELIGIBILITY' | 'ACTIVATE';
export type AdminAllowedAction = 'APPROVE' | 'REJECT' | 'REVOKE_APPROVAL';

export interface SellerPickupAddressSnapshot {
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  street: string;
  note?: string;
}

export interface SellerApplicationShopSnapshot {
  shopName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  emailVerified: boolean;
  pickupAddress: SellerPickupAddressSnapshot;
  categoryIds: string[];
  categoryNames: string[];
  shopDescription?: string;
  acceptedTerms: boolean;
}

export interface SellerApplicationVersionRecord {
  version: number;
  submittedAt: string;
  snapshot: SellerApplicationShopSnapshot;
}

export type SellerApplicationDecisionAction =
  | 'SUBMITTED'
  | 'RESUBMITTED'
  | 'WITHDRAWN'
  | 'APPROVED'
  | 'REJECTED'
  | 'APPROVAL_REVOKED'
  | 'ACTIVATED';

export interface SellerApplicationDecisionRecord {
  id: string;
  version: number;
  action: SellerApplicationDecisionAction;
  fromStatus: SellerApplicationStatus | 'NONE';
  toStatus: SellerApplicationStatus;
  actorId: string;
  actorRole: 'BUYER' | 'ADMIN';
  actorName?: string;
  publicReason?: string;
  internalNote?: string;
  occurredAt: string;
}

export interface SellerApplicationProps {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  status: SellerApplicationStatus;
  version: number;
  snapshot: SellerApplicationShopSnapshot;
  rejectionReason?: string | null;
  submittedAt: Date;
  reviewedAt?: Date | null;
  reviewedBy?: string | null;
  activatedAt?: Date | null;
  versions: SellerApplicationVersionRecord[];
  decisionHistory: SellerApplicationDecisionRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerApplicationBuyerDto {
  id: string;
  applicantId: string;
  status: SellerApplicationStatus;
  version: number;
  submittedAt: string;
  reviewedAt: string | null;
  activatedAt: string | null;
  snapshot: SellerApplicationShopSnapshot;
  rejectionReason: string | null;
  allowedActions: BuyerAllowedAction[];
  versions: SellerApplicationVersionRecord[];
  history: Array<{
    id: string;
    version: number;
    action: SellerApplicationDecisionAction;
    fromStatus: SellerApplicationStatus | 'NONE';
    toStatus: SellerApplicationStatus;
    actorRole: 'BUYER' | 'ADMIN';
    publicReason?: string;
    occurredAt: string;
  }>;
}

export interface SellerApplicationAdminDto {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  status: SellerApplicationStatus;
  version: number;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  activatedAt: string | null;
  snapshot: SellerApplicationShopSnapshot;
  rejectionReason: string | null;
  allowedActions: AdminAllowedAction[];
  versions: SellerApplicationVersionRecord[];
  decisionHistory: SellerApplicationDecisionRecord[];
  createdAt: string;
  updatedAt: string;
  applicant?: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    status: string;
    reputationScore: number;
    createdAt: string;
  };
}

/**
 * Domain Entity: SellerApplication
 * Quản lý máy trạng thái hồ sơ đăng ký bán hàng của Buyer -> Admin xét duyệt -> Kích hoạt Seller.
 */
export class SellerApplication {
  private readonly _id: string;
  private readonly _applicantId: string;
  private _applicantName: string;
  private _applicantEmail: string;
  private _status: SellerApplicationStatus;
  private _version: number;
  private _snapshot: SellerApplicationShopSnapshot;
  private _rejectionReason: string | null;
  private _submittedAt: Date;
  private _reviewedAt: Date | null;
  private _reviewedBy: string | null;
  private _activatedAt: Date | null;
  private _versions: SellerApplicationVersionRecord[];
  private _decisionHistory: SellerApplicationDecisionRecord[];
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: SellerApplicationProps) {
    this._id = props.id;
    this._applicantId = props.applicantId;
    this._applicantName = props.applicantName;
    this._applicantEmail = props.applicantEmail;
    this._status = props.status;
    this._version = props.version;
    this._snapshot = props.snapshot;
    this._rejectionReason = props.rejectionReason ?? null;
    this._submittedAt = props.submittedAt;
    this._reviewedAt = props.reviewedAt ?? null;
    this._reviewedBy = props.reviewedBy ?? null;
    this._activatedAt = props.activatedAt ?? null;
    this._versions = [...props.versions];
    this._decisionHistory = [...props.decisionHistory];
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get id(): string {
    return this._id;
  }
  public get applicantId(): string {
    return this._applicantId;
  }
  public get applicantName(): string {
    return this._applicantName;
  }
  public get applicantEmail(): string {
    return this._applicantEmail;
  }
  public get status(): SellerApplicationStatus {
    return this._status;
  }
  public get version(): number {
    return this._version;
  }
  public get snapshot(): SellerApplicationShopSnapshot {
    return this._snapshot;
  }
  public get rejectionReason(): string | null {
    return this._rejectionReason;
  }
  public get submittedAt(): Date {
    return this._submittedAt;
  }
  public get reviewedAt(): Date | null {
    return this._reviewedAt;
  }
  public get reviewedBy(): string | null {
    return this._reviewedBy;
  }
  public get activatedAt(): Date | null {
    return this._activatedAt;
  }
  public get versions(): SellerApplicationVersionRecord[] {
    return [...this._versions];
  }
  public get decisionHistory(): SellerApplicationDecisionRecord[] {
    return [...this._decisionHistory];
  }
  public get createdAt(): Date {
    return this._createdAt;
  }
  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public isOpenForAccount(): boolean {
    return (
      this._status === SellerApplicationStatus.PENDING ||
      this._status === SellerApplicationStatus.APPROVED
    );
  }

  public getBuyerAllowedActions(currentUserRole: string): BuyerAllowedAction[] {
    if (currentUserRole === 'SELLER' || this._status === SellerApplicationStatus.ACTIVATED) {
      return [];
    }
    if (currentUserRole !== 'BUYER') {
      return [];
    }
    switch (this._status) {
      case SellerApplicationStatus.PENDING:
        return ['WITHDRAW'];
      case SellerApplicationStatus.REJECTED:
      case SellerApplicationStatus.WITHDRAWN:
        return ['RESUBMIT'];
      case SellerApplicationStatus.APPROVED:
        return ['CHECK_ELIGIBILITY', 'ACTIVATE', 'WITHDRAW'];
      default:
        return [];
    }
  }

  public getAdminAllowedActions(): AdminAllowedAction[] {
    switch (this._status) {
      case SellerApplicationStatus.PENDING:
        return ['APPROVE', 'REJECT'];
      case SellerApplicationStatus.APPROVED:
        return ['REVOKE_APPROVAL'];
      default:
        return [];
    }
  }

  private assertExpectedVersion(expectedVersion?: number): void {
    if (expectedVersion !== undefined && Number(expectedVersion) !== this._version) {
      throw new SellerApplicationConflictException(
        'Trạng thái hoặc phiên bản hồ sơ đã thay đổi. Vui lòng tải lại dữ liệu mới nhất.',
        'VERSION_CONFLICT',
        { currentVersion: this._version, currentStatus: this._status },
      );
    }
  }

  public approve(params: {
    actorId: string;
    actorName?: string;
    expectedVersion?: number;
    internalNote?: string;
    decisionId: string;
    now?: Date;
  }): void {
    this.assertExpectedVersion(params.expectedVersion);

    if (this._status !== SellerApplicationStatus.PENDING) {
      throw new SellerApplicationConflictException(
        `Chỉ có thể duyệt hồ sơ đang ở trạng thái chờ xét duyệt (hiện tại: ${this._status}).`,
        'INVALID_STATUS_TRANSITION',
        { currentVersion: this._version, currentStatus: this._status },
      );
    }

    const now = params.now ?? new Date();
    const prevStatus = this._status;
    this._status = SellerApplicationStatus.APPROVED;
    this._version += 1;
    this._reviewedAt = now;
    this._reviewedBy = params.actorId;
    this._rejectionReason = null;
    this._updatedAt = now;

    this._decisionHistory.push({
      id: params.decisionId,
      version: this._version,
      action: 'APPROVED',
      fromStatus: prevStatus,
      toStatus: SellerApplicationStatus.APPROVED,
      actorId: params.actorId,
      actorRole: 'ADMIN',
      actorName: params.actorName,
      publicReason:
        'Hồ sơ đạt yêu cầu xét duyệt. Bạn có thể kiểm tra điều kiện và kích hoạt kênh Người bán.',
      internalNote: params.internalNote?.trim() || undefined,
      occurredAt: now.toISOString(),
    });
  }

  public reject(params: {
    actorId: string;
    actorName?: string;
    expectedVersion?: number;
    publicReason: string;
    internalNote?: string;
    decisionId: string;
    now?: Date;
  }): void {
    this.assertExpectedVersion(params.expectedVersion);

    if (this._status !== SellerApplicationStatus.PENDING) {
      throw new SellerApplicationConflictException(
        `Chỉ có thể từ chối hồ sơ đang ở trạng thái chờ xét duyệt (hiện tại: ${this._status}).`,
        'INVALID_STATUS_TRANSITION',
        { currentVersion: this._version, currentStatus: this._status },
      );
    }

    const cleanReason = params.publicReason?.trim() || '';
    if (cleanReason.length < 5) {
      throw new SellerApplicationValidationException(
        'Vui lòng nhập lý do từ chối cụ thể gửi cho người đăng ký (tối thiểu 5 ký tự).',
        { reason: 'Lý do từ chối cần tối thiểu 5 ký tự.' },
      );
    }

    const now = params.now ?? new Date();
    const prevStatus = this._status;
    this._status = SellerApplicationStatus.REJECTED;
    this._version += 1;
    this._reviewedAt = now;
    this._reviewedBy = params.actorId;
    this._rejectionReason = cleanReason;
    this._updatedAt = now;

    this._decisionHistory.push({
      id: params.decisionId,
      version: this._version,
      action: 'REJECTED',
      fromStatus: prevStatus,
      toStatus: SellerApplicationStatus.REJECTED,
      actorId: params.actorId,
      actorRole: 'ADMIN',
      actorName: params.actorName,
      publicReason: cleanReason,
      internalNote: params.internalNote?.trim() || undefined,
      occurredAt: now.toISOString(),
    });
  }

  public revokeApproval(params: {
    actorId: string;
    actorName?: string;
    expectedVersion?: number;
    publicReason: string;
    internalNote?: string;
    decisionId: string;
    now?: Date;
  }): void {
    this.assertExpectedVersion(params.expectedVersion);

    if (this._status === SellerApplicationStatus.ACTIVATED) {
      throw new SellerApplicationConflictException(
        'Tài khoản đã kích hoạt thành Seller. Không dùng thao tác thu hồi phê duyệt hồ sơ cho Seller đang hoạt động.',
        'INVALID_STATUS_TRANSITION',
        { currentVersion: this._version, currentStatus: this._status },
      );
    }

    if (this._status !== SellerApplicationStatus.APPROVED) {
      throw new SellerApplicationConflictException(
        `Chỉ có thể thu hồi phê duyệt khi hồ sơ đang ở trạng thái APPROVED (hiện tại: ${this._status}).`,
        'INVALID_STATUS_TRANSITION',
        { currentVersion: this._version, currentStatus: this._status },
      );
    }

    const cleanReason = params.publicReason?.trim() || '';
    if (cleanReason.length < 5) {
      throw new SellerApplicationValidationException(
        'Vui lòng nhập lý do thu hồi phê duyệt cụ thể (tối thiểu 5 ký tự).',
        { reason: 'Lý do thu hồi phê duyệt cần tối thiểu 5 ký tự.' },
      );
    }

    const now = params.now ?? new Date();
    const prevStatus = this._status;
    this._status = SellerApplicationStatus.REJECTED;
    this._version += 1;
    this._reviewedAt = now;
    this._reviewedBy = params.actorId;
    this._rejectionReason = cleanReason;
    this._updatedAt = now;

    this._decisionHistory.push({
      id: params.decisionId,
      version: this._version,
      action: 'APPROVAL_REVOKED',
      fromStatus: prevStatus,
      toStatus: SellerApplicationStatus.REJECTED,
      actorId: params.actorId,
      actorRole: 'ADMIN',
      actorName: params.actorName,
      publicReason: cleanReason,
      internalNote: params.internalNote?.trim() || undefined,
      occurredAt: now.toISOString(),
    });
  }

  public withdraw(params: {
    actorId: string;
    actorName?: string;
    expectedVersion?: number;
    reason?: string;
    decisionId: string;
    now?: Date;
  }): void {
    this.assertExpectedVersion(params.expectedVersion);

    if (this._status === SellerApplicationStatus.ACTIVATED) {
      throw new SellerApplicationConflictException(
        'Hồ sơ đã kích hoạt Seller thành công, không thể rút hồ sơ.',
        'INVALID_STATUS_TRANSITION',
        { currentVersion: this._version, currentStatus: this._status },
      );
    }

    if (
      this._status !== SellerApplicationStatus.PENDING &&
      this._status !== SellerApplicationStatus.APPROVED
    ) {
      throw new SellerApplicationConflictException(
        `Không thể rút hồ sơ đang ở trạng thái ${this._status}. Vui lòng tải lại trạng thái mới nhất.`,
        'INVALID_STATUS_TRANSITION',
        { currentVersion: this._version, currentStatus: this._status },
      );
    }

    const now = params.now ?? new Date();
    const prevStatus = this._status;
    this._status = SellerApplicationStatus.WITHDRAWN;
    this._version += 1;
    this._updatedAt = now;

    this._decisionHistory.push({
      id: params.decisionId,
      version: this._version,
      action: 'WITHDRAWN',
      fromStatus: prevStatus,
      toStatus: SellerApplicationStatus.WITHDRAWN,
      actorId: params.actorId,
      actorRole: 'BUYER',
      actorName: params.actorName,
      publicReason: params.reason?.trim() || 'Người đăng ký chủ động rút hồ sơ để chỉnh sửa.',
      occurredAt: now.toISOString(),
    });
  }

  public resubmit(params: {
    actorId: string;
    actorName?: string;
    expectedVersion?: number;
    snapshot: SellerApplicationShopSnapshot;
    decisionId: string;
    now?: Date;
  }): void {
    this.assertExpectedVersion(params.expectedVersion);

    if (
      this._status !== SellerApplicationStatus.REJECTED &&
      this._status !== SellerApplicationStatus.WITHDRAWN
    ) {
      throw new SellerApplicationConflictException(
        `Chỉ có thể gửi lại khi hồ sơ đang ở trạng thái REJECTED hoặc WITHDRAWN (hiện tại: ${this._status}).`,
        'INVALID_STATUS_TRANSITION',
        { currentVersion: this._version, currentStatus: this._status },
      );
    }

    const now = params.now ?? new Date();
    const prevStatus = this._status;
    this._version += 1;
    this._status = SellerApplicationStatus.PENDING;
    this._snapshot = params.snapshot;
    this._rejectionReason = null;
    this._submittedAt = now;
    this._reviewedAt = null;
    this._reviewedBy = null;
    this._updatedAt = now;

    this._versions.push({
      version: this._version,
      submittedAt: now.toISOString(),
      snapshot: params.snapshot,
    });

    this._decisionHistory.push({
      id: params.decisionId,
      version: this._version,
      action: 'RESUBMITTED',
      fromStatus: prevStatus,
      toStatus: SellerApplicationStatus.PENDING,
      actorId: params.actorId,
      actorRole: 'BUYER',
      actorName: params.actorName,
      publicReason: `Gửi lại hồ sơ phiên bản v${this._version}.`,
      occurredAt: now.toISOString(),
    });
  }

  public activate(params: {
    actorId: string;
    actorName?: string;
    expectedVersion?: number;
    decisionId: string;
    now?: Date;
  }): void {
    this.assertExpectedVersion(params.expectedVersion);

    if (this._status !== SellerApplicationStatus.APPROVED) {
      throw new SellerApplicationConflictException(
        `Chỉ hồ sơ đã được phê duyệt (APPROVED) mới có thể kích hoạt Seller (hiện tại: ${this._status}).`,
        'INVALID_STATUS_TRANSITION',
        { currentVersion: this._version, currentStatus: this._status },
      );
    }

    const now = params.now ?? new Date();
    const prevStatus = this._status;
    this._status = SellerApplicationStatus.ACTIVATED;
    this._version += 1;
    this._activatedAt = now;
    this._updatedAt = now;

    this._decisionHistory.push({
      id: params.decisionId,
      version: this._version,
      action: 'ACTIVATED',
      fromStatus: prevStatus,
      toStatus: SellerApplicationStatus.ACTIVATED,
      actorId: params.actorId,
      actorRole: 'BUYER',
      actorName: params.actorName,
      publicReason: 'Đã kiểm tra đủ điều kiện và xác nhận kích hoạt tài khoản Seller thành công.',
      occurredAt: now.toISOString(),
    });
  }

  public toBuyerDto(currentUserRole: string): SellerApplicationBuyerDto {
    return {
      id: this._id,
      applicantId: this._applicantId,
      status: this._status,
      version: this._version,
      submittedAt: this._submittedAt.toISOString(),
      reviewedAt: this._reviewedAt ? this._reviewedAt.toISOString() : null,
      activatedAt: this._activatedAt ? this._activatedAt.toISOString() : null,
      snapshot: this._snapshot,
      rejectionReason: this._rejectionReason,
      allowedActions: this.getBuyerAllowedActions(currentUserRole),
      versions: this._versions,
      // Tuyệt đối không lộ internalNote của Admin cho Buyer
      history: this._decisionHistory.map((item) => ({
        id: item.id,
        version: item.version,
        action: item.action,
        fromStatus: item.fromStatus,
        toStatus: item.toStatus,
        actorRole: item.actorRole,
        publicReason: item.publicReason,
        occurredAt: item.occurredAt,
      })),
    };
  }

  public toAdminDto(applicant?: SellerApplicationAdminDto['applicant']): SellerApplicationAdminDto {
    return {
      id: this._id,
      applicantId: this._applicantId,
      applicantName: this._applicantName,
      applicantEmail: this._applicantEmail,
      status: this._status,
      version: this._version,
      submittedAt: this._submittedAt.toISOString(),
      reviewedAt: this._reviewedAt ? this._reviewedAt.toISOString() : null,
      reviewedBy: this._reviewedBy,
      activatedAt: this._activatedAt ? this._activatedAt.toISOString() : null,
      snapshot: this._snapshot,
      rejectionReason: this._rejectionReason,
      allowedActions: this.getAdminAllowedActions(),
      versions: this._versions,
      decisionHistory: this._decisionHistory,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      ...(applicant ? { applicant } : {}),
    };
  }
}
