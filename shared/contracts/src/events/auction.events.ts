/**
 * =============================================================================
 * PROJECT NEXUS - REAL-TIME AUCTION & BIDDING DOMAIN EVENTS (SRS 2.8 & SCRUM-37)
 * =============================================================================
 * Danh mục hợp đồng sự kiện thuộc Bounded Context Auction (auction-service).
 * =============================================================================
 */

import { DomainEvent, DomainEventInitOptions } from './domain-event.base';

export interface AuctionCreatedPayload {
  auctionId: string;
  sellerId: string;
  productId: string;
  startingPrice: number;
  bidIncrement: number;
  startTime: string;
  endTime: string;
}

export class AuctionCreatedDomainEvent extends DomainEvent<AuctionCreatedPayload> {
  public static readonly EVENT_TYPE = 'auction.created';

  constructor(
    payload: AuctionCreatedPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<AuctionCreatedPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: AuctionCreatedDomainEvent.EVENT_TYPE,
      sourceService: 'auction-service',
      payload,
    });
  }
}

export interface AuctionStartedPayload {
  auctionId: string;
  productId: string;
  startedAt: string;
  endTime: string;
}

export class AuctionStartedDomainEvent extends DomainEvent<AuctionStartedPayload> {
  public static readonly EVENT_TYPE = 'auction.started';

  constructor(
    payload: AuctionStartedPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<AuctionStartedPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: AuctionStartedDomainEvent.EVENT_TYPE,
      sourceService: 'auction-service',
      payload,
    });
  }
}

export interface BidPlacedPayload {
  auctionId: string;
  bidderId: string;
  bidAmount: number;
  placedAt: string;
}

export class BidPlacedDomainEvent extends DomainEvent<BidPlacedPayload> {
  public static readonly EVENT_TYPE = 'auction.bid.placed';

  constructor(
    payload: BidPlacedPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<BidPlacedPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: BidPlacedDomainEvent.EVENT_TYPE,
      sourceService: 'auction-service',
      payload,
    });
  }
}

export interface AuctionOutbidPayload {
  auctionId: string;
  outbidBidderId: string;
  newHighestBid: number;
  outbidAt: string;
}

export class AuctionOutbidDomainEvent extends DomainEvent<AuctionOutbidPayload> {
  public static readonly EVENT_TYPE = 'auction.outbid';

  constructor(
    payload: AuctionOutbidPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<AuctionOutbidPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: AuctionOutbidDomainEvent.EVENT_TYPE,
      sourceService: 'auction-service',
      payload,
    });
  }
}

export interface AuctionWonPayload {
  auctionId: string;
  winnerId: string;
  sellerId: string;
  finalPrice: number;
  wonAt: string;
}

export class AuctionWonDomainEvent extends DomainEvent<AuctionWonPayload> {
  public static readonly EVENT_TYPE = 'auction.won';

  constructor(
    payload: AuctionWonPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<AuctionWonPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: AuctionWonDomainEvent.EVENT_TYPE,
      sourceService: 'auction-service',
      payload,
    });
  }
}

export interface AuctionCancelledPayload {
  auctionId: string;
  reason: string;
  cancelledBy: string;
  cancelledAt: string;
}

export class AuctionCancelledDomainEvent extends DomainEvent<AuctionCancelledPayload> {
  public static readonly EVENT_TYPE = 'auction.cancelled';

  constructor(
    payload: AuctionCancelledPayload,
    options?: Partial<
      Omit<DomainEventInitOptions<AuctionCancelledPayload>, 'type' | 'sourceService' | 'payload'>
    >,
  ) {
    super({
      ...options,
      type: AuctionCancelledDomainEvent.EVENT_TYPE,
      sourceService: 'auction-service',
      payload,
    });
  }
}
