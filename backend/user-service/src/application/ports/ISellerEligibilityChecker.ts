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

export interface SellerEligibilityCheckResult {
  eligible: boolean;
  serviceAvailable: boolean;
  blockers: SellerEligibilityBlocker[];
  checkedAt: string;
}

export interface ISellerEligibilityChecker {
  checkObligations(
    userId: string,
    options?: { authHeader?: string; simulateUnavailable?: boolean },
  ): Promise<SellerEligibilityCheckResult>;
  releaseOpenCheckoutReservations?(userId: string, authHeader?: string): Promise<void>;
}
