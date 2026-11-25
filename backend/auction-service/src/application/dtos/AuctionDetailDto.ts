import {
  AuctionSettlementRecord,
  AuctionTimelineEvent,
  AuctionVisibility,
} from '../../infrastructure/state/AuctionRuntimeStore';

export interface AuctionBidDetailDto {
  id: string;
  seq: number;
  bidder: string;
  displayAlias: string;
  amount: number;
  time: number;
  acceptedAt: string;
}

export interface AuctionEffectiveRulesDto {
  firstBidStartsAtStartPrice: boolean;
  bidIncrement: number;
  antiSnipingWindowSeconds: number;
  antiSnipingExtendSeconds: number;
  maxExtensions: number;
  buyNowBeforeFirstBidOnly: boolean;
  paymentDeadlineHours: number;
  minBuyerReputation: number;
  demoMode: boolean;
  demoMultiplier: number;
}

export interface AuctionDetailDto {
  id: string;
  productId: string;
  sellerId: string;
  title: string;
  imageUrl?: string;
  startingPrice: number;
  currentHighestBid: number;
  highestBidAmount: number | null;
  nextMinBid: number;
  highestBidderId?: string;
  bidIncrement: number;
  buyNowPrice?: number;
  status: string;
  visibility: AuctionVisibility;
  startTime: string;
  endTime: string;
  originalEndTime: string;
  effectiveEndsAt: string;
  actualEndTime?: string;
  extensionCount: number;
  maxExtensions: number;
  version: number;
  serverTime: string;
  demoMode: boolean;
  demoMultiplier: number;
  createdByAdminId?: string;
  cancelReason?: string;
  publicCancelReason?: string;
  internalCancelNote?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  auditRef?: string;
  effectiveRules: AuctionEffectiveRulesDto;
  settlement?: AuctionSettlementRecord;
  timeline?: AuctionTimelineEvent[];
  bids: AuctionBidDetailDto[];
  bidCount: number;
  bidHistoryAvailable: boolean;
}
