import express, { Application, Request, Response } from 'express';
import cors from 'cors';

export function createApplication(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Gateway Service Registry (Port mapping matching docker, k8s & local dev)
  const SERVICE_ENDPOINTS = {
    user:
      process.env.USER_SERVICE_URL || `http://localhost:${process.env.USER_SERVICE_PORT || 4001}`,
    catalog:
      process.env.CATALOG_SERVICE_URL ||
      `http://localhost:${process.env.CATALOG_SERVICE_PORT || 4002}`,
    commerce:
      process.env.COMMERCE_SERVICE_URL ||
      `http://localhost:${process.env.COMMERCE_SERVICE_PORT || 4003}`,
    auction:
      process.env.AUCTION_SERVICE_URL ||
      `http://localhost:${process.env.AUCTION_SERVICE_PORT || 4004}`,
    fulfillment:
      process.env.FULFILLMENT_SERVICE_URL ||
      `http://localhost:${process.env.FULFILLMENT_SERVICE_PORT || 4005}`,
    notification:
      process.env.NOTIFICATION_SERVICE_URL ||
      `http://localhost:${process.env.NOTIFICATION_SERVICE_PORT || 4006}`,
  };

  // Gateway Central Health Check Endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      gateway: 'api-gateway',
      timestamp: new Date().toISOString(),
      services: SERVICE_ENDPOINTS,
    });
  });

  // Gateway Forwarding Info
  app.get('/api/v1', (_req: Request, res: Response) => {
    res.status(200).json({
      name: 'Nexus E-Commerce & Auction API Gateway',
      version: '1.0.0',
      boundedContexts: [
        { name: 'User & IAM', prefix: '/api/v1/users', target: SERVICE_ENDPOINTS.user },
        { name: 'Catalog', prefix: '/api/v1/products', target: SERVICE_ENDPOINTS.catalog },
        { name: 'Commerce & Orders', prefix: '/api/v1/orders', target: SERVICE_ENDPOINTS.commerce },
        {
          name: 'Auction & Bidding',
          prefix: '/api/v1/auctions',
          target: SERVICE_ENDPOINTS.auction,
        },
        {
          name: 'Fulfillment & Shipping',
          prefix: '/api/v1/fulfillments',
          target: SERVICE_ENDPOINTS.fulfillment,
        },
        {
          name: 'Notification',
          prefix: '/api/v1/notifications',
          target: SERVICE_ENDPOINTS.notification,
        },
      ],
    });
  });

  return app;
}
