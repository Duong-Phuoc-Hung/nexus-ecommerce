import { Router } from 'express';
import { PolicyController } from '../controllers/PolicyController';

export function createPolicyRoutes(controller: PolicyController): Router {
  const router = Router();

  // 1. Tra cứu FAQ chính sách có nguồn dẫn chứng (Kịch bản B)
  router.post('/faq', (req, res) => controller.queryFaq(req, res));

  // 2. Danh sách toàn bộ quy chế đang hoạt động
  router.get('/policies', (req, res) => controller.listPolicies(req, res));

  return router;
}
