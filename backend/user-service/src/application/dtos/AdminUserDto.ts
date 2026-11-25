export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function trustTier(score: number) {
  if (score >= 90) return { trustTier: 'HIGH', trustTierLabel: 'Tin cậy cao' };
  if (score >= 70) return { trustTier: 'STANDARD', trustTierLabel: 'Tiêu chuẩn' };
  if (score >= 50) return { trustTier: 'WATCH', trustTierLabel: 'Cần theo dõi' };
  return { trustTier: 'RESTRICTED', trustTierLabel: 'Bị giới hạn' };
}

export function restrictionFeature(feature: string): string {
  return feature === 'BAN_BIDDING' ? 'AUCTION_BID' : feature;
}

export interface RoleSettings {
  name: string;
  description: string | null;
  permissions: string[];
}
