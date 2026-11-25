import { Request, Response, Router } from 'express';
import { InvoiceError, InvoiceService } from '../../../application/services/InvoiceService';
import { AuthenticatedRequest, requireAuth } from '../../../infrastructure/security/auth';

export function createInvoiceRoutes(invoiceService: InvoiceService): Router {
  const router = Router();

  const handleInvoice = async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Vui lòng đăng nhập để xem hóa đơn.' });
        return;
      }
      const orderId = String(req.params.id || '').trim();
      const invoice = await invoiceService.getOrIssueInvoice(orderId, {
        userId: user.sub,
        role: user.role,
      });
      res.status(200).json({ success: true, data: invoice });
    } catch (error) {
      if (error instanceof InvoiceError) {
        res.status(error.status).json({
          success: false,
          code: error.code,
          error: error.message,
        });
        return;
      }
      console.error('[commerce-service] Invoice route error:', error);
      res.status(500).json({ success: false, error: 'Không thể tải hoặc phát hành hóa đơn.' });
    }
  };

  router.get('/orders/:id/invoice', requireAuth, handleInvoice);
  router.post('/orders/:id/invoice/issue', requireAuth, handleInvoice);

  return router;
}
