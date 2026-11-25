import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import {
  createPostgresAuctionTransaction,
  TransactionalAuctionRepository,
} from './infrastructure/repositories/TransactionalAuctionRepository';
import { InMemoryAuctionRepository } from './infrastructure/repositories/InMemoryAuctionRepository';
import { GetAuctionDetailUseCase } from './application/use-cases/GetAuctionDetailUseCase';
import { CreateAuctionRoomUseCase } from './application/use-cases/CreateAuctionRoomUseCase';
import { AuctionController } from './interfaces/http/controllers/AuctionController';
import { createAuctionRoutes } from './interfaces/http/routes/AuctionRoutes';
import { checkRedisHealth, RedisHealthStatus } from './infrastructure/redis/RedisClient';
import { GetBidHistoryUseCase } from './application/use-cases/GetBidHistoryUseCase';
import {
  createAuctionMutations,
  createInMemoryAuctionTransaction,
} from './application/auction-mutations';
import { AuctionCheckoutUseCase } from './application/use-cases/AuctionCheckoutUseCase';
import { SettleAuctionUseCase } from './application/use-cases/SettleAuctionUseCase';
import { RabbitMqEventPublisher } from './infrastructure/messaging/RabbitMqEventPublisher';
import { HttpCommerceOrderClient } from './infrastructure/clients/HttpCommerceOrderClient';
import { HttpUserReputationClient } from './infrastructure/clients/HttpUserReputationClient';

export function createApplication(
  healthChecker: () => Promise<RedisHealthStatus> = checkRedisHealth,
): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Aggregated Health Endpoint (SCRUM-41: Redis Ping Health Indicator)
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

  // Lightweight Liveness Probe
  app.get('/health/liveness', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'auction-service',
      boundedContext: 'Real-Time Auction & Bidding (SRS 3.5)',
      timestamp: new Date().toISOString(),
    });
  });

  const inMemory = process.env.USE_IN_MEMORY_DB === 'true';
  const auctionRepository = inMemory
    ? new InMemoryAuctionRepository()
    : new TransactionalAuctionRepository();
  const userReputationClient = new HttpUserReputationClient();
  const mutations = createAuctionMutations(
    inMemory
      ? createInMemoryAuctionTransaction(auctionRepository)
      : createPostgresAuctionTransaction(),
    userReputationClient,
  );

  const getAuctionDetailUseCase = new GetAuctionDetailUseCase(auctionRepository);
  const createAuctionRoomUseCase = new CreateAuctionRoomUseCase(auctionRepository);
  const getBidHistoryUseCase = new GetBidHistoryUseCase(auctionRepository);
  const commerceOrderClient = new HttpCommerceOrderClient();
  const auctionCheckoutUseCase = new AuctionCheckoutUseCase(auctionRepository, commerceOrderClient);
  const eventPublisher = new RabbitMqEventPublisher();
  const settleAuctionUseCase = new SettleAuctionUseCase(auctionRepository, eventPublisher);

  const auctionController = new AuctionController(
    getAuctionDetailUseCase,
    createAuctionRoomUseCase,
    mutations.bid,
    getBidHistoryUseCase,
    mutations.update,
    mutations.buy,
    mutations.cancel,
    auctionRepository,
    auctionCheckoutUseCase,
    settleAuctionUseCase,
  );

  app.use('/api/v1/auctions', createAuctionRoutes(auctionController));

  return app;
}
