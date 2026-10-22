export class UnauthorizedException extends Error {
  public readonly code = 'UNAUTHORIZED';

  constructor(message = 'Yêu cầu xác thực phiên đăng nhập (JWT token).') {
    super(message);
    this.name = 'UnauthorizedException';
  }
}

export class ForbiddenException extends Error {
  public readonly code = 'FORBIDDEN';

  constructor(message = 'Bạn không có quyền thực hiện thao tác này.') {
    super(message);
    this.name = 'ForbiddenException';
  }
}
