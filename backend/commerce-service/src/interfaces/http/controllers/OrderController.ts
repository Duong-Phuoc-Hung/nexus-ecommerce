import { Request, Response } from 'express';
import { GetOrderDetailUseCase } from '../../../application/use-cases/GetOrderDetailUseCase';
import { OrderNotFoundException } from '../../../domain/exceptions/OrderNotFoundException';

export class OrderController {
  constructor(private readonly getOrderDetailUseCase: GetOrderDetailUseCase) {}

  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const orderId = (req.params.id || 'ord_01hqz555abc') as string;
      const order = await this.getOrderDetailUseCase.execute(orderId);
      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      if (error instanceof OrderNotFoundException) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
      });
    }
  }

  public async checkout(req: Request, res: Response): Promise<void> {
    const { items, shippingAddress } = req.body;
    res.status(201).json({
      success: true,
      message: 'Checkout intent created (Skeleton mode)',
      data: {
        orderId: 'ord_' + Date.now(),
        items: items || [],
        shippingAddress: shippingAddress || 'Default Address',
        clientSecret: 'pi_skeleton_secret_test_123',
      },
    });
  }
}
