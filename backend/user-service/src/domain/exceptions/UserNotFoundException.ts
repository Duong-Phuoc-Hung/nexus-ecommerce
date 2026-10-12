/**
 * Domain Exception: UserNotFoundException
 * Ném ra khi truy vấn người dùng nhưng không tìm thấy trong hệ thống.
 */
export class UserNotFoundException extends Error {
  constructor(identifier: string) {
    super(`User with identifier "${identifier}" was not found.`);
    this.name = 'UserNotFoundException';
  }
}
