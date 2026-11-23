import { Router } from 'express';
import { Pool } from 'pg';
import { CheckoutService } from '../../../application/checkout/CheckoutService';
import { IShippingQuote } from '../../../application/checkout/ports';
import { FlatRateShippingQuote } from '../../../infrastructure/clients/FlatRateShippingQuote';
import { GhnShippingQuoteClient } from '../../../infrastructure/clients/GhnShippingQuoteClient';
import { HttpCatalogClient } from '../../../infrastructure/clients/HttpCatalogClient';
import { PayOsGateway } from '../../../infrastructure/clients/PayOsGateway';
import { PostgresCheckoutRepository } from '../../../infrastructure/repositories/PostgresCheckoutRepository';
import { PostgresPromotionRepository } from '../../../infrastructure/repositories/PostgresPromotionRepository';
import { PromotionService } from '../../../application/promotion/PromotionService';
import { getCommerceDbPool } from '../../../infrastructure/database/pgPool';
import { requireAuth } from '../../../infrastructure/security/auth';
import { CheckoutController, requireBuyer } from '../controllers/CheckoutController';

export function createCheckoutRouter(controller: CheckoutController): Router {
  const router = Router();
  const buyerOnly = [requireAuth, requireBuyer];

  router.get('/checkout/promotions', ...buyerOnly, controller.getPromotions);
  router.post('/checkout/promotions/validate', ...buyerOnly, controller.validatePromotion);
  router.post('/checkout/quote', ...buyerOnly, controller.quote);
  router.post('/orders/checkout', ...buyerOnly, controller.checkout);
  router.post('/orders/:id/payment-link', ...buyerOnly, controller.paymentLink);
  router.get('/orders/:id/payment-status', ...buyerOnly, controller.paymentStatus);
  router.post('/payments/payos/webhook', controller.webhook);

  return router;
}

/** Cấu hình từ biến môi trường; Pool của pg chỉ kết nối khi có truy vấn đầu tiên. */
export function createCheckoutRoutes(
  customPool?: Pool,
  customShippingQuote?: IShippingQuote,
  customPromotionService?: PromotionService,
): Router {
  const pool = customPool || getCommerceDbPool();
  const catalogClient = new HttpCatalogClient();
  const promotionService =
    customPromotionService ||
    new PromotionService(new PostgresPromotionRepository(pool), catalogClient);

  const service = new CheckoutService(
    new PostgresCheckoutRepository(pool),
    catalogClient,
    customShippingQuote || new GhnShippingQuoteClient(),
    new PayOsGateway(),
    promotionService,
  );
  return createCheckoutRouter(new CheckoutController(service));
}
