import { Router } from 'express';
import { Pool } from 'pg';
import { CheckoutService } from '../../../application/checkout/CheckoutService';
import { IShippingQuote } from '../../../application/checkout/ports';
import { FlatRateShippingQuote } from '../../../infrastructure/clients/FlatRateShippingQuote';
import { GhnShippingQuoteClient } from '../../../infrastructure/clients/GhnShippingQuoteClient';
import { HttpCatalogClient } from '../../../infrastructure/clients/HttpCatalogClient';
import { CommerceNotificationClient } from '../../../infrastructure/clients/CommerceNotificationClient';
import { PayOsGateway } from '../../../infrastructure/clients/PayOsGateway';
import { PostgresCheckoutRepository } from '../../../infrastructure/repositories/PostgresCheckoutRepository';
import { PostgresPromotionRepository } from '../../../infrastructure/repositories/PostgresPromotionRepository';
import { PromotionService } from '../../../application/promotion/PromotionService';
import { getCommerceDbPool } from '../../../infrastructure/database/pgPool';
import { requireAuth, requireAdmin } from '../../../infrastructure/security/auth';
import { CheckoutController, requireBuyer } from '../controllers/CheckoutController';
import { AdminCommerceController } from '../controllers/AdminCommerceController';

export function createCheckoutRouter(
  controller: CheckoutController,
  adminController?: AdminCommerceController,
): Router {
  const router = Router();
  const buyerOnly = [requireAuth, requireBuyer];
  const adminOnly = [requireAuth, requireAdmin];

  router.get('/checkout/promotions', ...buyerOnly, controller.getPromotions);
  router.post('/checkout/promotions/validate', ...buyerOnly, controller.validatePromotion);
  router.post('/checkout/quote', ...buyerOnly, controller.quote);
  router.post('/orders/checkout', ...buyerOnly, controller.checkout);
  router.post('/orders/:id/payment-link', ...buyerOnly, controller.paymentLink);
  router.get('/orders/:id/payment-status', ...buyerOnly, controller.paymentStatus);
  router.post('/payments/payos/webhook', controller.webhook);

  if (adminController) {
    router.get('/checkout/admin/promotions', ...adminOnly, (req, res) =>
      adminController.listPromotions(req, res),
    );
    router.post('/checkout/admin/promotions', ...adminOnly, (req, res) =>
      adminController.createPromotion(req, res),
    );
    router.put('/checkout/admin/promotions/:id', ...adminOnly, (req, res) =>
      adminController.updatePromotion(req, res),
    );
    router.patch('/checkout/admin/promotions/:id/status', ...adminOnly, (req, res) =>
      adminController.updatePromotionStatus(req, res),
    );
    router.delete('/checkout/admin/promotions/:id', ...adminOnly, (req, res) =>
      adminController.deletePromotion(req, res),
    );
    router.get('/checkout/admin/promotions/:id/usages', ...adminOnly, (req, res) =>
      adminController.getPromotionUsages(req, res),
    );
  }

  return router;
}

/** Cấu hình từ biến môi trường; Pool của pg chỉ kết nối khi có truy vấn đầu tiên. */
export function createCheckoutRoutes(
  customPool?: Pool,
  customShippingQuote?: IShippingQuote,
  customPromotionService?: PromotionService,
  customAdminController?: AdminCommerceController,
): Router {
  const pool = customPool || getCommerceDbPool();
  const catalogClient = new HttpCatalogClient();
  const promotionService =
    customPromotionService ||
    new PromotionService(new PostgresPromotionRepository(pool), catalogClient);
  const notificationClient = new CommerceNotificationClient();

  const service = new CheckoutService(
    new PostgresCheckoutRepository(pool),
    catalogClient,
    customShippingQuote || new GhnShippingQuoteClient(),
    new PayOsGateway(),
    promotionService,
    notificationClient,
  );
  return createCheckoutRouter(new CheckoutController(service), customAdminController);
}
