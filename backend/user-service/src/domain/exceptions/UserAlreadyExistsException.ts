/**
 * Domain Exception: UserAlreadyExistsException
 * Bắn ra khi email hoặc định danh người dùng đã tồn tại trong hệ thống.
 */
export class UserAlreadyExistsException extends Error {
  constructor(message: string = 'Tài khoản với email này đã tồn tại trong hệ thống') {
    super(message);
    this.name = 'UserAlreadyExistsException';
  }
}
