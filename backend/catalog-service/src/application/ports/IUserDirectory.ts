export interface SellerAccount {
  id: string;
  fullName: string;
  role: string;
  status: string;
}

export interface IUserDirectory {
  findById(userId: string, accessToken: string): Promise<SellerAccount | null>;
}

export class UserDirectoryUnavailableError extends Error {
  constructor() {
    super('User Service is unavailable while validating the selected Seller.');
    this.name = 'UserDirectoryUnavailableError';
  }
}

export class InvalidSellerAccountError extends Error {
  constructor() {
    super('Seller được chọn không tồn tại hoặc không hoạt động.');
    this.name = 'InvalidSellerAccountError';
  }
}
