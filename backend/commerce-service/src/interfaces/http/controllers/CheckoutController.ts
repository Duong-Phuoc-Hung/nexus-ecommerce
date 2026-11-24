import { NextFunction, Request, Response } from 'express';
import { CheckoutError } from '../../../application/checkout/ports';
import { CheckoutService } from '../../../application/checkout/CheckoutService';
import { AuthenticatedRequest } from '../../../infrastructure/security/auth';

export function requireBuyer(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthenticatedRequest).user;
  if (!user || user.role !== 'BUYER') {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Chỉ tài khoản Buyer mới được thực hiện thao tác này.' },
    });
    return;
  }
  next();
}

export class CheckoutController {
  constructor(private readonly service: CheckoutService) {}

  public quote = (req: Request, res: Response): Promise<void> =>
    this.run(res, async () => {
      const data = await this.service.quote(this.buyerId(req), req.body);
      res.status(200).json({ success: true, data });
    });

  public checkout = (req: Request, res: Response): Promise<void> =>
    this.run(res, async () => {
      const key = req.header('Idempotency-Key')?.trim() || undefined;
      const result = await this.service.checkout(this.buyerId(req), req.body, key);
      res.status(result.replay ? 200 : 201).json({ success: true, data: result.data });
    });

  public paymentLink = (req: Request, res: Response): Promise<void> =>
    this.run(res, async () => {
      const data = await this.service.paymentLink(
        this.buyerId(req),
        String(req.params.id),
        req.body,
      );
      res.status(200).json({ success: true, data });
    });

  public paymentStatus = (req: Request, res: Response): Promise<void> =>
    this.run(res, async () => {
      const data = await this.service.paymentStatus(this.buyerId(req), String(req.params.id));
      res.status(200).json({ success: true, data });
    });

  public getPromotions = (req: Request, res: Response): Promise<void> =>
    this.run(res, async () => {
      const subtotalParam = req.query.subtotal ? Number(req.query.subtotal) : undefined;
      const data = await this.service.getPromotions(this.buyerId(req), subtotalParam);
      res.status(200).json({ success: true, data });
    });

  public validatePromotion = (req: Request, res: Response): Promise<void> =>
    this.run(res, async () => {
      const { code, items, subtotal } = req.body || {};
      const data = await this.service.validatePromotion({
        code: String(code || ''),
        userId: this.buyerId(req),
        subtotal: subtotal !== undefined ? Number(subtotal) : undefined,
        items,
      });
      res.status(200).json({ success: true, data });
    });

  public webhook = (req: Request, res: Response): Promise<void> =>
    this.run(res, async () => {
      const outcome = await this.service.handleWebhook(req.body);
      res.status(200).json({ success: true, data: { outcome } });
    });

  private buyerId(req: Request): string {
    return (req as AuthenticatedRequest).user!.sub;
  }

  private async run(res: Response, work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch (error) {
      if (
        error instanceof CheckoutError ||
        (error instanceof Error && (error.name === 'CheckoutError' || (error as any).code))
      ) {
        const ce = error as any;
        res.status(ce.status || 400).json({
          success: false,
          error: { code: ce.code, message: ce.message, details: ce.details },
        });
        return;
      }
      console.error('[commerce] checkout error', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Đã xảy ra lỗi hệ thống.' },
      });
    }
  }
}
