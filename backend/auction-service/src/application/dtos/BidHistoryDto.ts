export interface BidHistoryDto {
  id?: string;
  auctionId: string;
  bidderId: string;
  bidAmount: number;
  bidTime: string;
  isWinning: boolean;
}
