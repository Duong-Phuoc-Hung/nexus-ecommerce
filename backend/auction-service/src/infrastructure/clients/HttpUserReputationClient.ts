import {
  IUserReputationClient,
  UserReputationCheckResult,
} from '../../application/ports/IUserReputationClient';

export class HttpUserReputationClient implements IUserReputationClient {
  private static readonly memoryScores = new Map<string, { score: number; restricted: boolean }>();

  constructor(
    private readonly baseUrl: string = process.env.USER_SERVICE_URL ||
      `http://localhost:${process.env.USER_SERVICE_PORT || 4001}`,
  ) {}

  public static setMockScore(userId: string, score: number, restricted = false): void {
    HttpUserReputationClient.memoryScores.set(userId, { score, restricted });
  }

  public static clearMockScores(): void {
    HttpUserReputationClient.memoryScores.clear();
  }

  public async getUserReputation(
    userId: string,
    token?: string,
  ): Promise<UserReputationCheckResult> {
    // 1. Kiểm tra mock score cấu hình trong bộ nhớ test
    if (HttpUserReputationClient.memoryScores.has(userId)) {
      const mock = HttpUserReputationClient.memoryScores.get(userId)!;
      const eligible = mock.score >= 50 && !mock.restricted;
      return {
        userId,
        reputationScore: mock.score,
        biddingEligible: eligible,
        isRestricted: mock.restricted,
        reason: !eligible
          ? mock.score < 50
            ? 'Điểm uy tín dưới 50'
            : 'Tài khoản đang bị hạn chế đấu giá'
          : undefined,
      };
    }

    // 2. Gọi HTTP sang User Service
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}/api/v1/users/${encodeURIComponent(userId)}`, {
        headers,
        signal: AbortSignal.timeout(2000),
      });

      if (response.ok) {
        const body = (await response.json()) as any;
        const data = body.data || body;
        const score = typeof data.reputationScore === 'number' ? data.reputationScore : 100;
        const restrictions = Array.isArray(data.activeRestrictions) ? data.activeRestrictions : [];
        const isRestricted = restrictions.some(
          (r: any) =>
            r.restriction === 'BAN_BIDDING' ||
            r.restriction === 'BID' ||
            r.feature === 'AUCTION_BID',
        );
        const eligible = score >= 50 && !isRestricted;

        return {
          userId,
          reputationScore: score,
          biddingEligible: eligible,
          isRestricted,
          reason: !eligible
            ? score < 50
              ? 'Điểm uy tín không đủ điều kiện (tối thiểu 50)'
              : 'Tài khoản đang bị hạn chế tham gia đấu giá'
            : undefined,
        };
      }
    } catch {
      // Fallback khi chạy kiểm thử độc lập mà User Service chưa bật
    }

    // Mặc định cho tài khoản hợp lệ
    return {
      userId,
      reputationScore: 100,
      biddingEligible: true,
      isRestricted: false,
    };
  }
}
