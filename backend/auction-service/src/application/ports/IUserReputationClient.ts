export interface UserReputationCheckResult {
  userId: string;
  reputationScore: number;
  biddingEligible: boolean;
  isRestricted: boolean;
  reason?: string;
}

export interface IUserReputationClient {
  getUserReputation(userId: string, token?: string): Promise<UserReputationCheckResult>;
}
