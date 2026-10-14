import express, { Application, Request, Response } from 'express';
import cors from 'cors';

export function createApplication(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

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

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      gateway: 'api-gateway',
      timestamp: new Date().toISOString(),
      services: SERVICE_ENDPOINTS,
    });
  });

  app.get('/api/v1', (_req: Request, res: Response) => {
    res.status(200).json({
      name: 'Nexus E-Commerce & Auction API Gateway',
      version: '1.0.0',
      boundedContexts: [
        { name: 'Auth', prefix: '/api/v1/auth', target: SERVICE_ENDPOINTS.user },
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

  const proxyToUserService = async (req: Request, res: Response): Promise<void> => {
    try {
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers)) {
        if (
          [
            'host',
            'content-length',
            'connection',
            'transfer-encoding',
            'content-encoding',
          ].includes(name.toLowerCase())
        )
          continue;
        if (Array.isArray(value)) {
          for (const item of value) headers.append(name, item);
        } else if (value !== undefined) {
          headers.set(name, value);
        }
      }

      const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
      if (hasBody && !headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
      const upstream = await fetch(`${SERVICE_ENDPOINTS.user}${req.originalUrl}`, {
        method: req.method,
        headers,
        body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
      });

      res.status(upstream.status);
      const contentType = upstream.headers.get('content-type');
      if (contentType) res.setHeader('content-type', contentType);
      res.send(await upstream.text());
    } catch {
      res.status(502).json({
        success: false,
        error: 'User service is currently unavailable.',
      });
    }
  };

  app.use('/api/v1/auth', proxyToUserService);
  app.use('/api/v1/users', proxyToUserService);

  return app;
}
