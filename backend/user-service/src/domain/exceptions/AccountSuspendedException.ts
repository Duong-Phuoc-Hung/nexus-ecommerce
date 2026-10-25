/**
 * Domain Exception: AccountSuspendedException
 * Bắn ra khi tài khoản người dùng đang ở trạng thái không hoạt động (LOCKED / SUSPENDED).
 */
export class AccountSuspendedException extends Error {
  constructor(message: string = 'Tài khoản của bạn đã bị khóa hoặc tạm dừng hoạt động') {
    super(message);
    this.name = 'AccountSuspendedException';
  }
}
