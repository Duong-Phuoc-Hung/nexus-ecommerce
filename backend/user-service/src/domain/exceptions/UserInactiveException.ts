export class UserInactiveException extends Error {
  constructor(userId: string) {
    super(`User "${userId}" is inactive or suspended.`);
    this.name = 'UserInactiveException';
  }
}
