import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.GATEWAY_PORT ? parseInt(process.env.GATEWAY_PORT, 10) : 8000;
const app = express();

app.use(cors());
app.use(express.json());

// Gateway Service Registry (Port mapping matching docker & local dev)
const SERVICE_ENDPOINTS = {
  user: `http://localhost:${process.env.USER_SERVICE_PORT || 3001}`,
  catalog: `http://localhost:${process.env.CATALOG_SERVICE_PORT || 3002}`,
  commerce: `http://localhost:${process.env.COMMERCE_SERVICE_PORT || 3003}`,
  auction: `http://localhost:${process.env.AUCTION_SERVICE_PORT || 3004}`,
  fulfillment: `http://localhost:${process.env.FULFILLMENT_SERVICE_PORT || 3005}`,
  notification: `http://localhost:${process.env.NOTIFICATION_SERVICE_PORT || 3006}`,
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
      { name: 'Auction & Bidding', prefix: '/api/v1/auctions', target: SERVICE_ENDPOINTS.auction },
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

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`🚀 [API Gateway] running on http://localhost:${PORT}`);
  console.log(`🩺 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Service Directory: http://localhost:${PORT}/api/v1`);
  console.log('='.repeat(60));
});
