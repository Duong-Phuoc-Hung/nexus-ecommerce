export interface AuctionBidDetailDto {
  id: string;
  bidder: string;
  amount: number;
  time: number;
}

export interface AuctionDetailDto {
  id: string;
  productId: string;
  sellerId: string;
  title: string;
  imageUrl?: string;
  startingPrice: number;
  currentHighestBid: number;
  highestBidderId?: string;
  bidIncrement: number;
  buyNowPrice?: number;
  status: string;
  startTime: string;
  endTime: string;
  actualEndTime?: string;
  cancelReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  bids: AuctionBidDetailDto[];
  bidCount: number;
  bidHistoryAvailable: boolean;
}
