import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { InMemoryAuctionRepository } from './infrastructure/repositories/InMemoryAuctionRepository';
import { GetAuctionDetailUseCase } from './application/use-cases/GetAuctionDetailUseCase';
import { AuctionController } from './interfaces/http/controllers/AuctionController';
import { createAuctionRoutes } from './interfaces/http/routes/AuctionRoutes';
import { checkRedisHealth } from './infrastructure/redis/RedisClient';

export function createApplication(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Liveness Probe (kiểm tra tính sẵn sàng nhanh của HTTP Server)
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'auction-service',
      boundedContext: 'Real-Time Auction & Bidding (SRS 3.5)',
      port: process.env.PORT || process.env.AUCTION_SERVICE_PORT || 4004,
      timestamp: new Date().toISOString(),
    });
  });

  // Dedicated Redis Healthcheck Probe (SCRUM-32)
  app.get('/health/redis', async (_req: Request, res: Response) => {
    const health = await checkRedisHealth();
    const statusCode = health.status === 'UP' ? 200 : 503;
    res.status(statusCode).json(health);
  });

  const auctionRepository = new InMemoryAuctionRepository();
  const getAuctionDetailUseCase = new GetAuctionDetailUseCase(auctionRepository);
  const auctionController = new AuctionController(getAuctionDetailUseCase, auctionRepository);

  app.use('/api/v1/auctions', createAuctionRoutes(auctionController));

  return app;
}
