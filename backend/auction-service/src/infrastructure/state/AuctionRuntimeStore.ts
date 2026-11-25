import { generateUuidV7 } from '../utils/uuid';

export type AuctionVisibility = 'PUBLIC' | 'RESTRICTED';

export type AuctionSettlementOutcome = 'PENDING_SETTLEMENT' | 'WON' | 'NO_BIDS' | 'CANCELLED';

export interface AuctionTimelineEvent {
  id: string;
  auctionId: string;
  type:
    | 'CREATED'
    | 'UPDATED'
    | 'STARTED'
    | 'BID_PLACED'
    | 'EXTENDED'
    | 'BUY_NOW'
    | 'ENDED'
    | 'SETTLED'
    | 'CANCELLED'
    | 'CHECKOUT_CREATED';
  occurredAt: string;
  actorId?: string;
  actorRole?: string;
  summary: string;
  publicReason?: string;
  internalNote?: string;
  metadata?: Record<string, unknown>;
}

export interface AuctionSettlementRecord {
  auctionId: string;
  outcome: AuctionSettlementOutcome;
  closedReason?: 'TIME_EXPIRED' | 'BUY_NOW' | 'ADMIN_CANCELLED';
  winnerId?: string;
  winnerAlias?: string;
  winnerName?: string | null;
  finalPrice?: number;
  winningBidAmount?: number;
  settledAt?: string;
  paymentReadyAt?: string;
  paymentDueAt?: string;
  orderId?: string;
  orderCode?: string;
  paymentUrl?: string;
  paymentStatus?: 'PENDING' | 'PAID' | 'TIMEOUT' | 'RECONCILING' | 'NONE';
  checkoutResult?: any;
}

export interface AuctionMetaRecord {
  auctionId: string;
  originalEndTime: string;
  extensionCount: number;
  maxExtensions: number;
  antiSnipingWindowSeconds: number;
  antiSnipingExtendSeconds: number;
  version: number;
  visibility: AuctionVisibility;
  invitedUserIds: string[];
  demoMode: boolean;
  demoMultiplier: number;
  createdByAdminId?: string;
  publicCancelReason?: string;
  internalCancelNote?: string;
  auditRef?: string;
}

export interface BidIdempotencyRecord {
  key: string;
  auctionId: string;
  bidderId: string;
  amount: number;
  result: any;
  createdAt: number;
}

export const PAYMENT_DEADLINE_MS = 24 * 60 * 60 * 1000;

class AuctionRuntimeStoreImpl {
  private readonly meta = new Map<string, AuctionMetaRecord>();
  private readonly timeline = new Map<string, AuctionTimelineEvent[]>();
  private readonly settlements = new Map<string, AuctionSettlementRecord>();
  private readonly bidIdempotency = new Map<string, BidIdempotencyRecord>();

  public ensureMeta(
    auctionId: string,
    defaults: {
      endTime: Date | string;
      startingPrice?: number;
      bidIncrement?: number;
      antiSnipingWindowSeconds?: number;
      antiSnipingExtendSeconds?: number;
      maxExtensions?: number;
      visibility?: AuctionVisibility;
      invitedUserIds?: string[];
      demoMode?: boolean;
      demoMultiplier?: number;
      createdByAdminId?: string;
    },
  ): AuctionMetaRecord {
    const existing = this.meta.get(auctionId);
    if (existing) {
      if (defaults.visibility !== undefined) {
        existing.visibility = defaults.visibility;
      }
      if (defaults.invitedUserIds !== undefined) {
        existing.invitedUserIds = [...defaults.invitedUserIds];
      }
      return existing;
    }

    const endIso =
      defaults.endTime instanceof Date
        ? defaults.endTime.toISOString()
        : new Date(defaults.endTime).toISOString();

    // Nhận diện phiên demo theo cấu hình hoặc quy ước mức giá nhỏ (1-999 VND)
    const inferredDemo =
      defaults.demoMode ??
      (typeof defaults.startingPrice === 'number' &&
        defaults.startingPrice > 0 &&
        defaults.startingPrice < 1000);

    const record: AuctionMetaRecord = {
      auctionId,
      originalEndTime: endIso,
      extensionCount: 0,
      maxExtensions: defaults.maxExtensions ?? 3,
      antiSnipingWindowSeconds: defaults.antiSnipingWindowSeconds ?? 120,
      antiSnipingExtendSeconds: defaults.antiSnipingExtendSeconds ?? 300,
      version: 1,
      visibility: defaults.visibility ?? 'PUBLIC',
      invitedUserIds: defaults.invitedUserIds ?? [],
      demoMode: inferredDemo,
      demoMultiplier: defaults.demoMultiplier ?? (inferredDemo ? 1_000_000 : 1),
      createdByAdminId: defaults.createdByAdminId,
    };
    this.meta.set(auctionId, record);
    return record;
  }

  public getMeta(auctionId: string): AuctionMetaRecord | undefined {
    return this.meta.get(auctionId);
  }

  public updateMeta(
    auctionId: string,
    patch: Partial<AuctionMetaRecord>,
  ): AuctionMetaRecord | undefined {
    const existing = this.meta.get(auctionId);
    if (!existing) return undefined;
    const next: AuctionMetaRecord = { ...existing, ...patch };
    this.meta.set(auctionId, next);
    return next;
  }

  public bumpVersion(auctionId: string): number {
    const existing = this.meta.get(auctionId);
    if (!existing) return 1;
    existing.version += 1;
    return existing.version;
  }

  public appendTimeline(
    auctionId: string,
    event: Omit<AuctionTimelineEvent, 'id' | 'auctionId' | 'occurredAt'> & { occurredAt?: string },
  ): AuctionTimelineEvent {
    const entry: AuctionTimelineEvent = {
      id: generateUuidV7(),
      auctionId,
      occurredAt: event.occurredAt || new Date().toISOString(),
      type: event.type,
      actorId: event.actorId,
      actorRole: event.actorRole,
      summary: event.summary,
      publicReason: event.publicReason,
      internalNote: event.internalNote,
      metadata: event.metadata,
    };
    const list = this.timeline.get(auctionId) || [];
    list.push(entry);
    this.timeline.set(auctionId, list);
    return entry;
  }

  public getTimeline(auctionId: string): AuctionTimelineEvent[] {
    return [...(this.timeline.get(auctionId) || [])];
  }

  public getSettlement(auctionId: string): AuctionSettlementRecord | undefined {
    return this.settlements.get(auctionId);
  }

  public setSettlement(record: AuctionSettlementRecord): AuctionSettlementRecord {
    this.settlements.set(record.auctionId, record);
    return record;
  }

  public makeIdempotencyLookupKey(auctionId: string, bidderId: string, key: string): string {
    return `${auctionId}::${bidderId}::${key}`;
  }

  public getBidIdempotency(
    auctionId: string,
    bidderId: string,
    key: string,
  ): BidIdempotencyRecord | undefined {
    return this.bidIdempotency.get(this.makeIdempotencyLookupKey(auctionId, bidderId, key));
  }

  public saveBidIdempotency(record: BidIdempotencyRecord): void {
    this.bidIdempotency.set(
      this.makeIdempotencyLookupKey(record.auctionId, record.bidderId, record.key),
      record,
    );
  }
}

export const auctionRuntimeStore = new AuctionRuntimeStoreImpl();
