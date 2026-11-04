import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { userSpec, catalogSpec, auctionSpec, commerceSpec, fulfillmentSpec } from './swagger-specs';

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
        { name: 'Categories', prefix: '/api/v1/categories', target: SERVICE_ENDPOINTS.catalog },
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
          name: 'Support & Staff Portal',
          prefix: '/api/v1/support',
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

  // Endpoints cung cấp spec cho từng Service
  app.get('/docs-json/user', (_req: Request, res: Response) => res.json(userSpec));
  app.get('/docs-json/catalog', (_req: Request, res: Response) => res.json(catalogSpec));
  app.get('/docs-json/auction', (_req: Request, res: Response) => res.json(auctionSpec));
  app.get('/docs-json/commerce', (_req: Request, res: Response) => res.json(commerceSpec));
  app.get('/docs-json/fulfillment', (_req: Request, res: Response) => res.json(fulfillmentSpec));

  const swaggerUrls = [
    { name: '1. User & Auth Service', url: '/docs-json/user' },
    { name: '2. Catalog Service (Sản phẩm)', url: '/docs-json/catalog' },
    { name: '3. Auction Service (Đấu giá)', url: '/docs-json/auction' },
    { name: '4. Commerce Service (Đơn hàng & Support)', url: '/docs-json/commerce' },
    { name: '5. Fulfillment Service (Vận chuyển & Support)', url: '/docs-json/fulfillment' },
  ];

  // Swagger UI tổng với Dropdown chọn từng Service
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      explorer: true,
      swaggerUrls: swaggerUrls,
      persistAuthorization: true,
      swaggerOptions: {
        persistAuthorization: true,
      },
      customCss: `
        .swagger-ui .topbar { display: block !important; background-color: #1b1b1b; padding: 10px 0; }
        .swagger-ui .topbar .download-url-wrapper { display: flex !important; align-items: center; justify-content: flex-end; }
        .swagger-ui .topbar .download-url-wrapper select { min-width: 320px; font-weight: bold; padding: 6px 12px; font-size: 14px; border-radius: 4px; }
      `,
    } as any),
  );

  const createProxy = (serviceName: string, targetBaseUrl: string) => {
    return async (req: Request, res: Response): Promise<void> => {
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
              'expect',
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
        const upstream = await fetch(`${targetBaseUrl}${req.originalUrl}`, {
          method: req.method,
          headers,
          body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
        });

        const text = await upstream.text();
        res.status(upstream.status);
        const contentType = upstream.headers.get('content-type') || 'application/json';
        res.setHeader('content-type', contentType);
        res.setHeader('content-length', Buffer.byteLength(text));
        res.end(text);
      } catch (proxyErr) {
        console.error(`[Gateway Proxy Error -> ${serviceName}]:`, proxyErr);
        res.status(502).json({
          success: false,
          error: `${serviceName} is currently unavailable. Vui lòng kiểm tra cổng service đã được bật chưa.`,
        });
      }
    };
  };

  app.use('/api/v1/auth', createProxy('User Service', SERVICE_ENDPOINTS.user));
  app.use('/api/v1/users', createProxy('User Service', SERVICE_ENDPOINTS.user));
  app.use('/api/v1/products', createProxy('Catalog Service', SERVICE_ENDPOINTS.catalog));
  app.use('/api/v1/categories', createProxy('Catalog Service', SERVICE_ENDPOINTS.catalog));
  app.use('/api/v1/auctions', createProxy('Auction Service', SERVICE_ENDPOINTS.auction));
  app.use('/api/v1/orders', createProxy('Commerce Service', SERVICE_ENDPOINTS.commerce));
  app.use('/api/v1/checkout', createProxy('Commerce Service', SERVICE_ENDPOINTS.commerce));
  app.use('/api/v1/payments', createProxy('Commerce Service', SERVICE_ENDPOINTS.commerce));
  app.use(
    '/api/v1/fulfillments',
    createProxy('Fulfillment Service', SERVICE_ENDPOINTS.fulfillment),
  );
  app.use(
    '/api/v1/support',
    createProxy('Support / Fulfillment Service', SERVICE_ENDPOINTS.fulfillment),
  );
  app.use(
    '/api/v1/notifications',
    createProxy('Notification Service', SERVICE_ENDPOINTS.notification),
  );

  return app;
}
