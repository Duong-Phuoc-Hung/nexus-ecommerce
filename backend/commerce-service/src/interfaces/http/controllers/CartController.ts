import { Request, Response } from 'express';
import { CartService, CartValidationError } from '../../../application/cart/CartService';
import {
  validateAddToCartInput,
  validateUpdateCartItemInput,
} from '../../../application/cart/dtos/AddToCartDto';
import { AuthenticatedRequest } from '../../../infrastructure/security/auth';

export class CartController {
  constructor(private readonly cartService: CartService) {}

  public getCart = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const cart = await this.cartService.getCart(userId);
      res.status(200).json({ success: true, data: cart });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  public addItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const validatedInput = validateAddToCartInput(req.body);
      const cart = await this.cartService.addItem(userId, validatedInput);
      res.status(200).json({
        success: true,
        message: 'Đã thêm sản phẩm vào giỏ hàng thành công.',
        data: cart,
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  public updateItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const itemId = String(req.params.id);
      const validated = validateUpdateCartItemInput(req.body);
      const cart = await this.cartService.updateItemQuantity(userId, itemId, validated.quantity);
      res.status(200).json({
        success: true,
        message: 'Đã cập nhật số lượng món hàng.',
        data: cart,
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  public removeItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const itemId = String(req.params.id);
      const cart = await this.cartService.removeItem(userId, itemId);
      res.status(200).json({
        success: true,
        message: 'Đã xóa món hàng khỏi giỏ hàng.',
        data: cart,
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  public clearCart = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const cart = await this.cartService.clearCart(userId);
      res.status(200).json({
        success: true,
        message: 'Đã xóa sạch giỏ hàng.',
        data: cart,
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  private getUserId(req: Request): string {
    const user = (req as AuthenticatedRequest).user;
    return user ? user.sub : '';
  }

  private handleError(res: Response, error: unknown): void {
    if (error instanceof CartValidationError) {
      res.status(error.status).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          fieldErrors: error.fieldErrors,
        },
      });
      return;
    }
    console.error('[CartController Error]:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Đã xảy ra lỗi khi xử lý giỏ hàng.' },
    });
  }
}
