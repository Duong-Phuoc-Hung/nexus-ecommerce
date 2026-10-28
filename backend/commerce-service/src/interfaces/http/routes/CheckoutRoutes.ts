import { Router } from 'express';
import { Pool } from 'pg';
import { CheckoutService } from '../../../application/checkout/CheckoutService';
import { FlatRateShippingQuote } from '../../../infrastructure/clients/FlatRateShippingQuote';
import { HttpCatalogClient } from '../../../infrastructure/clients/HttpCatalogClient';
import { PayOsGateway } from '../../../infrastructure/clients/PayOsGateway';
import { PostgresCheckoutRepository } from '../../../infrastructure/repositories/PostgresCheckoutRepository';
import { requireAuth } from '../../../infrastructure/security/auth';
import { CheckoutController, requireBuyer } from '../controllers/CheckoutController';

export function createCheckoutRouter(controller: CheckoutController): Router {
  const router = Router();
  const buyerOnly = [requireAuth, requireBuyer];

  router.post('/checkout/quote', ...buyerOnly, controller.quote);
  router.post('/orders/checkout', ...buyerOnly, controller.checkout);
  router.post('/orders/:id/payment-link', ...buyerOnly, controller.paymentLink);
  router.get('/orders/:id/payment-status', ...buyerOnly, controller.paymentStatus);
  router.post('/payments/payos/webhook', controller.webhook);

  return router;
}

/** Cấu hình từ biến môi trường; Pool của pg chỉ kết nối khi có truy vấn đầu tiên. */
export function createCheckoutRoutes(): Router {
  const pool = new Pool({
    host: process.env.COMMERCE_DB_HOST || 'localhost',
    port: Number(process.env.COMMERCE_DB_PORT) || 5434,
    user: process.env.COMMERCE_DB_USER || 'nexus_commerce',
    password: process.env.COMMERCE_DB_PASSWORD || 'nexus_password',
    database: process.env.COMMERCE_DB_NAME || 'nexus_commerce_db',
  });
  const service = new CheckoutService(
    new PostgresCheckoutRepository(pool),
    new HttpCatalogClient(),
    new FlatRateShippingQuote(),
    new PayOsGateway(),
  );
  return createCheckoutRouter(new CheckoutController(service));
}
