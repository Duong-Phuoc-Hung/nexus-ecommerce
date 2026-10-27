import {
  IUserDirectory,
  SellerAccount,
  UserDirectoryUnavailableError,
} from '../../application/ports/IUserDirectory';

interface UserProfileResponse {
  success?: boolean;
  data?: {
    id?: unknown;
    fullName?: unknown;
    role?: unknown;
    status?: unknown;
  };
}

export class HttpUserDirectory implements IUserDirectory {
  private readonly baseUrl: string;

  constructor(baseUrl = process.env.USER_SERVICE_URL || 'http://localhost:4001') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public async findById(userId: string, accessToken: string): Promise<SellerAccount | null> {
    let response: Response;
    try {
      response = await fetch(
        `${this.baseUrl}/api/v1/users/${encodeURIComponent(userId)}`,
        { headers: { authorization: `Bearer ${accessToken}` } },
      );
    } catch {
      throw new UserDirectoryUnavailableError();
    }

    if (response.status === 404) return null;
    if (!response.ok) throw new UserDirectoryUnavailableError();

    let body: UserProfileResponse;
    try {
      body = (await response.json()) as UserProfileResponse;
    } catch {
      throw new UserDirectoryUnavailableError();
    }

    const user = body.data;
    if (
      !body.success ||
      typeof user?.id !== 'string' ||
      typeof user.fullName !== 'string' ||
      typeof user.role !== 'string' ||
      typeof user.status !== 'string'
    ) {
      throw new UserDirectoryUnavailableError();
    }

    return {
      id: user.id,
      fullName: user.fullName,
      role: user.role.toUpperCase(),
      status: user.status.toUpperCase(),
    };
  }
}
