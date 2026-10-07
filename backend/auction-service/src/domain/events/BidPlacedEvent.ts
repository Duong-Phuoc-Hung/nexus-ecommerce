export interface BidPlacedEventPayload {
  auctionId: string;
  bidderId: string;
  bidAmount: number;
  newEndTime: string;
  timestamp: string;
}

export class BidPlacedEvent {
  public static readonly EVENT_NAME = 'auction.bid.placed';

  public readonly eventName: string = BidPlacedEvent.EVENT_NAME;
  public readonly occurredOn: Date = new Date();

  constructor(public readonly payload: BidPlacedEventPayload) {}
}
