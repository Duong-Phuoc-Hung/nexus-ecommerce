export class SellerApplicationError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
    public readonly code: string = 'SELLER_APPLICATION_ERROR',
    public readonly fieldErrors?: Record<string, string>,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'SellerApplicationError';
  }
}

export class SellerApplicationNotFoundException extends SellerApplicationError {
  constructor(message = 'Không tìm thấy hồ sơ đăng ký bán hàng.') {
    super(message, 404, 'APPLICATION_NOT_FOUND');
    this.name = 'SellerApplicationNotFoundException';
  }
}

export class SellerApplicationForbiddenException extends SellerApplicationError {
  constructor(message = 'Bạn không có quyền truy cập hoặc thao tác trên hồ sơ này.') {
    super(message, 403, 'APPLICATION_FORBIDDEN');
    this.name = 'SellerApplicationForbiddenException';
  }
}

export class SellerApplicationValidationException extends SellerApplicationError {
  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message, 422, 'VALIDATION_ERROR', fieldErrors);
    this.name = 'SellerApplicationValidationException';
  }
}

export class SellerApplicationConflictException extends SellerApplicationError {
  constructor(
    message: string,
    code:
      | 'DUPLICATE_ACTIVE_APPLICATION'
      | 'VERSION_CONFLICT'
      | 'INVALID_STATUS_TRANSITION'
      | 'ACTIVATION_IN_PROGRESS' = 'VERSION_CONFLICT',
    details?: Record<string, unknown>,
  ) {
    super(message, 409, code, undefined, details);
    this.name = 'SellerApplicationConflictException';
  }
}

export class SellerActivationBlockedException extends SellerApplicationError {
  constructor(
    message: string,
    code: 'ACTIVATION_BLOCKED' | 'OBLIGATION_SERVICE_UNAVAILABLE' = 'ACTIVATION_BLOCKED',
    details?: Record<string, unknown>,
  ) {
    super(message, code === 'OBLIGATION_SERVICE_UNAVAILABLE' ? 503 : 422, code, undefined, details);
    this.name = 'SellerActivationBlockedException';
  }
}
