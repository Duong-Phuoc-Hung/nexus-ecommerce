export class AuctionNotFoundException extends Error {
  constructor(auctionId: string) {
    super(`Auction with ID "${auctionId}" was not found.`);
    this.name = 'AuctionNotFoundException';
  }
}
