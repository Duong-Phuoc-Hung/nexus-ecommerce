export interface UserReputationCheckResult {
  available: boolean;
  userId: string;
  reputationScore: number;
  status: string;
  canBid: boolean;
  restricted?: boolean;
  reason?: string;
}

export const MIN_BUYER_BID_REPUTATION = 50;

export class HttpUserReputationClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    const raw =
      baseUrl ||
      process.env.USER_SERVICE_URL ||
      `http://127.0.0.1:${process.env.USER_SERVICE_PORT || 4001}`;
    this.baseUrl = raw.replace('http://localhost:', 'http://127.0.0.1:').replace(/\/$/, '');
  }

  public async checkBuyerEligibility(
    userId: string,
    authHeader?: string,
  ): Promise<UserReputationCheckResult> {
    if (
      process.env.NODE_ENV === 'test' &&
      process.env.USE_IN_MEMORY_DB === 'true' &&
      process.env.ENFORCE_REMOTE_REPUTATION !== 'true'
    ) {
      return {
        available: true,
        userId,
        reputationScore: 50,
        status: 'ACTIVE',
        canBid: true,
      };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (authHeader) headers.Authorization = authHeader;

      const res = await fetch(`${this.baseUrl}/api/v1/users/me/reputation`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        return {
          available: false,
          userId,
          reputationScore: 50,
          status: 'UNKNOWN',
          canBid: false,
          reason: 'Không thể xác minh điểm uy tín từ User Service lúc này. Vui lòng thử lại.',
        };
      }

      const json = (await res.json()) as any;
      const data = json?.data ?? json;
      const score =
        typeof data?.score === 'number'
          ? data.score
          : typeof data?.reputationScore === 'number'
            ? data.reputationScore
            : Number.NaN;
      if (!Number.isFinite(score)) throw new Error('Missing reputation score');
      const restricted = Boolean(
        data?.isBidRestricted ||
        data?.restricted ||
        data?.canBid === false ||
        data?.biddingEligible === false,
      );
      const status = String(data?.accountStatus || data?.status || 'ACTIVE').toUpperCase();

      if (status === 'SUSPENDED') {
        return {
          available: true,
          userId,
          reputationScore: score,
          status,
          canBid: false,
          restricted: true,
          reason: 'Tài khoản đang bị tạm khóa, không thể tham gia đặt giá.',
        };
      }
      if (restricted) {
        return {
          available: true,
          userId,
          reputationScore: score,
          status,
          canBid: false,
          restricted: true,
          reason: data?.restrictionReason || 'Tài khoản đang bị hạn chế quyền đặt giá.',
        };
      }
      if (score < MIN_BUYER_BID_REPUTATION) {
        return {
          available: true,
          userId,
          reputationScore: score,
          status,
          canBid: false,
          reason: `Uy tín hiện tại ${score}/100. Cần tối thiểu ${MIN_BUYER_BID_REPUTATION} điểm để đặt giá.`,
        };
      }

      return {
        available: true,
        userId,
        reputationScore: score,
        status,
        canBid: true,
      };
    } catch {
      return {
        available: false,
        userId,
        reputationScore: 50,
        status: 'UNKNOWN',
        canBid: false,
        reason: 'Dịch vụ uy tín tạm gián đoạn, vui lòng thử lại sau giây lát.',
      };
    }
  }
}
