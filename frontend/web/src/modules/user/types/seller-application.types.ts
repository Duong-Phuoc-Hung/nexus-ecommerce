export type SellerApplicationStatus =
  'PENDING' | 'REJECTED' | 'WITHDRAWN' | 'APPROVED' | 'ACTIVATED';

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

export interface SellerApplicationPublicHistoryItem {
  id: string;
  version: number;
  action: SellerApplicationDecisionAction;
  fromStatus: SellerApplicationStatus | 'NONE';
  toStatus: SellerApplicationStatus;
  actorRole: 'BUYER' | 'ADMIN';
  publicReason?: string;
  occurredAt: string;
}

export interface SellerApplicationDecisionRecord extends SellerApplicationPublicHistoryItem {
  actorId: string;
  actorName?: string;
  internalNote?: string;
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
  history: SellerApplicationPublicHistoryItem[];
}

export interface SellerApplicationMeResponse {
  application: SellerApplicationBuyerDto | null;
  accountRole: string;
  accountEmail: string;
  accountFullName: string;
  accountPhone: string;
  emailVerified: boolean;
  allowedActions: string[];
}

export interface SellerApplicationFormInput {
  shopName: string;
  contactName: string;
  contactPhone: string;
  pickupAddress: {
    provinceCode: string;
    provinceName: string;
    wardCode: string;
    wardName: string;
    street: string;
    note?: string;
  };
  categoryIds: string[];
  categoryNames: string[];
  shopDescription?: string;
  acceptedTerms: boolean;
  expectedVersion?: number;
}

export type SellerEligibilityBlockerCode =
  | 'ACCOUNT_NOT_ACTIVE_BUYER'
  | 'APPLICATION_NOT_APPROVED'
  | 'OPEN_BUYER_ORDER'
  | 'UNSETTLED_PAYMENT_OR_REFUND'
  | 'LEADING_ACTIVE_AUCTION'
  | 'PARTICIPATING_ACTIVE_AUCTION'
  | 'UNSETTLED_WON_AUCTION'
  | 'OPEN_DISPUTE'
  | 'OBLIGATION_SERVICE_UNAVAILABLE';

export type SellerEligibilityReferenceType = 'ORDER' | 'AUCTION' | 'SUPPORT' | 'ACCOUNT';

export interface SellerEligibilityBlocker {
  code: SellerEligibilityBlockerCode;
  message: string;
  referenceType: SellerEligibilityReferenceType;
  referenceId?: string;
  referenceLabel?: string;
}

export interface SellerActivationEligibilityResponse {
  applicationId: string;
  status: SellerApplicationStatus;
  version: number;
  eligible: boolean;
  serviceAvailable: boolean;
  blockers: SellerEligibilityBlocker[];
  checkedAt: string;
}

export interface SellerActivationResult {
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

export interface SellerApplicationStatusSummary {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  activatedCount: number;
  withdrawnCount: number;
}

export interface AdminSellerApplicationsPageResponse {
  items: SellerApplicationAdminDto[];
  summary: SellerApplicationStatusSummary;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const SELLER_APPLICATION_STATUS_META: Record<
  SellerApplicationStatus,
  {
    label: string;
    buyerSummary: string;
    badgeVariant: 'warning' | 'destructive' | 'outline' | 'info' | 'success';
  }
> = {
  PENDING: {
    label: 'Chờ xét duyệt',
    buyerSummary:
      'Hồ sơ của bạn đã được gửi và đang chờ Quản trị viên xét duyệt. Trong thời gian chờ, bạn vẫn giữ nguyên quyền mua sắm của Buyer.',
    badgeVariant: 'warning',
  },
  REJECTED: {
    label: 'Cần điều chỉnh hồ sơ',
    buyerSummary:
      'Hồ sơ cần bổ sung hoặc chỉnh sửa theo phản hồi từ Quản trị viên. Bạn có thể cập nhật và gửi lại phiên bản mới.',
    badgeVariant: 'destructive',
  },
  WITHDRAWN: {
    label: 'Đã rút hồ sơ',
    buyerSummary:
      'Bạn đã chủ động rút hồ sơ đăng ký bán hàng. Bạn có thể chỉnh sửa thông tin và gửi lại bất kỳ lúc nào.',
    badgeVariant: 'outline',
  },
  APPROVED: {
    label: 'Đã duyệt, chờ kích hoạt',
    buyerSummary:
      'Quản trị viên đã chấp thuận hồ sơ của bạn! Tài khoản vẫn đang là Buyer cho đến khi bạn kiểm tra điều kiện và xác nhận kích hoạt Seller.',
    badgeVariant: 'info',
  },
  ACTIVATED: {
    label: 'Đã kích hoạt Seller',
    buyerSummary:
      'Tài khoản của bạn đã chuyển sang vai trò Người bán (SELLER) thành công và sẵn sàng quản lý gian hàng.',
    badgeVariant: 'success',
  },
};
