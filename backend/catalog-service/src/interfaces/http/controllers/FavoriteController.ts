import { Request, Response } from 'express';
import { GetFavoritesUseCase } from '../../../application/use-cases/GetFavoritesUseCase';
import { ToggleFavoriteUseCase } from '../../../application/use-cases/ToggleFavoriteUseCase';
import { AuthenticatedRequest } from '../../../infrastructure/security/auth';
import { ProductNotFoundException } from '../../../domain/exceptions/ProductNotFoundException';

export class FavoriteController {
  constructor(
    private readonly getFavoritesUseCase: GetFavoritesUseCase,
    private readonly toggleFavoriteUseCase: ToggleFavoriteUseCase,
  ) {}

  public getFavorites = async (req: Request, res: Response): Promise<void> => {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      if (!authUser || !authUser.id) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: Bạn cần đăng nhập để xem danh sách yêu thích.',
        });
        return;
      }

      const products = await this.getFavoritesUseCase.execute({ userId: authUser.id });

      res.status(200).json({
        success: true,
        data: products.map((product) => ({
          id: product.id,
          sellerId: product.sellerId,
          sellerName: product.sellerName || 'Nexus Official Store',
          saleType: product.saleType,
          categoryId: product.categoryId,
          title: product.title,
          slug: product.slug,
          price: product.price,
          currency: 'VND',
          stockQuantity: product.stockQuantity,
          status: product.status,
          images: product.images,
          primaryImage: product.primaryImage,
        })),
        total: products.length,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Lỗi khi lấy danh sách yêu thích.',
      });
    }
  };

  public toggleFavorite = async (req: Request, res: Response): Promise<void> => {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      if (!authUser || !authUser.id) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: Bạn cần đăng nhập để thực hiện thao tác này.',
        });
        return;
      }

      const productId = String(req.params.productId);
      const result = await this.toggleFavoriteUseCase.execute({
        userId: authUser.id,
        productId,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof ProductNotFoundException) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: error.message || 'Lỗi khi cập nhật yêu thích sản phẩm.',
      });
    }
  };
}
