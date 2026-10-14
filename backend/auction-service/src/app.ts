import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { InMemoryAuctionRepository } from './infrastructure/repositories/InMemoryAuctionRepository';
import { GetAuctionDetailUseCase } from './application/use-cases/GetAuctionDetailUseCase';
import { AuctionController } from './interfaces/http/controllers/AuctionController';
import { createAuctionRoutes } from './interfaces/http/routes/AuctionRoutes';
import { checkRedisHealth, RedisHealthStatus } from './infrastructure/redis/RedisClient';

export function createApplication(
  healthChecker: () => Promise<RedisHealthStatus> = checkRedisHealth,
): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Aggregated Health Endpoint (SCRUM-41: Redis Ping Health Indicator)
  // Trả về HTTP 200 khi Redis UP, HTTP 503 khi Redis DOWN/timeout nhằm tránh "healthy giả"
  app.get('/health', async (_req: Request, res: Response) => {
    let redisHealth: RedisHealthStatus;

    if (process.env.SKIP_REDIS_HEALTHCHECK === 'true') {
      redisHealth = {
        status: 'UP',
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        latencyMs: 0,
        timestamp: new Date().toISOString(),
      };
    } else {
      redisHealth = await healthChecker();
    }

    const isHealthy = redisHealth.status === 'UP';
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: isHealthy ? 'UP' : 'DOWN',
      service: 'auction-service',
      boundedContext: 'Real-Time Auction & Bidding (SRS 3.5)',
      port: process.env.PORT || process.env.AUCTION_SERVICE_PORT || 4004,
      timestamp: new Date().toISOString(),
      components: {
        redis: redisHealth,
      },
    });
  });

  // Dedicated Redis Healthcheck Probe (SCRUM-32 / SCRUM-41)
  app.get('/health/redis', async (_req: Request, res: Response) => {
    const health = await healthChecker();
    const statusCode = health.status === 'UP' ? 200 : 503;
    res.status(statusCode).json(health);
  });

  // Lightweight Liveness Probe (Kiểm tra HTTP Server tiến trình còn sống)
  app.get('/health/liveness', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'auction-service',
      boundedContext: 'Real-Time Auction & Bidding (SRS 3.5)',
      timestamp: new Date().toISOString(),
    });
  });

  const auctionRepository = new InMemoryAuctionRepository();
  const getAuctionDetailUseCase = new GetAuctionDetailUseCase(auctionRepository);
  const auctionController = new AuctionController(getAuctionDetailUseCase, auctionRepository);

  app.use('/api/v1/auctions', createAuctionRoutes(auctionController));

  return app;
}
