import { Auction } from '../entities/Auction';

export interface IAuctionRepository {
  findById(id: string): Promise<Auction | null>;
  findActiveAuctions(): Promise<Auction[]>;
  save(auction: Auction): Promise<void>;
  update(auction: Auction): Promise<void>;
}
