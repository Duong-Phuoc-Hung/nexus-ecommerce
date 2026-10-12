export interface AuctionDetailDto {
  id: string;
  productId: string;
  sellerId: string;
  currentHighestBid: number;
  highestBidderId?: string;
  bidIncrement: number;
  status: string;
  endTime: string;
}
