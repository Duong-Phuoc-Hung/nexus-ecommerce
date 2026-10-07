import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { InMemoryAuctionRepository } from './infrastructure/repositories/InMemoryAuctionRepository';
import { GetAuctionDetailUseCase } from './application/use-cases/GetAuctionDetailUseCase';
import { AuctionController } from './interfaces/http/controllers/AuctionController';
import { createAuctionRoutes } from './interfaces/http/routes/AuctionRoutes';

export function createApplication(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'auction-service',
      boundedContext: 'Real-Time Auction & Bidding (SRS 3.5)',
      port: process.env.AUCTION_SERVICE_PORT || 3004,
      timestamp: new Date().toISOString(),
    });
  });

  const auctionRepository = new InMemoryAuctionRepository();
  const getAuctionDetailUseCase = new GetAuctionDetailUseCase(auctionRepository);
  const auctionController = new AuctionController(getAuctionDetailUseCase, auctionRepository);

  app.use('/api/v1/auctions', createAuctionRoutes(auctionController));

  return app;
}
