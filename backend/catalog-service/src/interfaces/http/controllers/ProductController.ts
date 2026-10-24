import { Request, Response } from 'express';
import { GetProductDetailUseCase } from '../../../application/use-cases/GetProductDetailUseCase';
import { ProductNotFoundException } from '../../../domain/exceptions/ProductNotFoundException';
import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { SearchProductsUseCase } from '../../../application/use-cases/SearchProductsUseCase';
import { parseSearchProductsQuery } from '../dtos/SearchProductsQueryDto';
import { UpdateProductUseCase } from '../../../application/use-cases/UpdateProductUseCase';
import { CreateProductUseCase } from '../../../application/use-cases/CreateProductUseCase';
import { AuthenticatedRequest } from '../../../infrastructure/security/auth';
import { DeleteProductUseCase } from '../../../application/use-cases/DeleteProductUseCase';
import { GetSellerProductsUseCase } from '../../../application/use-cases/GetSellerProductsUseCase';

export class ProductController {
  constructor(
    private readonly getProductDetailUseCase: GetProductDetailUseCase,
    private readonly productRepository: IProductRepository,
    private readonly searchProductsUseCase: SearchProductsUseCase,
    private readonly createProductUseCase?: CreateProductUseCase,
    private readonly updateProductUseCase?: UpdateProductUseCase,
    private readonly deleteProductUseCase?: DeleteProductUseCase,
    private readonly getSellerProductsUseCase?: GetSellerProductsUseCase,
  ) {}

  public async search(req: Request, res: Response): Promise<void> {
    const validation = parseSearchProductsQuery(req.query as Record<string, unknown>);
    if (!validation.valid) {
      res.status(400).json({ success: false, error: validation.error });
      return;
    }

    try {
      const result = await this.searchProductsUseCase.execute(validation.value);
      res.status(200).json({
        success: true,
        data: result.products.map((product) => ({
          id: product.id,
          sellerId: product.sellerId,
          sellerName: product.sellerName || 'Nexus Official Store',
          saleType: product.saleType,
          categoryId: product.categoryId,
          title: product.title,
          price: product.price,
          currency: 'VND',
          stockQuantity: product.stockQuantity,
          status: product.status,
        })),
        meta: result.meta,
      });
    } catch {
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }

  // 1. API DÀNH CHO KHÁCH: Xem tất cả sản phẩm công khai ngoài sàn
  public async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const products = await this.productRepository.findAll();
      res.status(200).json({
        success: true,
        data: products.map((p) => ({
          id: p.id,
          sellerId: p.sellerId,
          sellerName: p.sellerName || 'Nexus Official Store',
          saleType: p.saleType,
          categoryId: p.categoryId,
          title: p.title,
          description: p.description,
          price: p.price,
          currency: 'VND',
          stockQuantity: p.stockQuantity,
          status: p.status,
          images: p.images,
          primaryImage: p.primaryImage,
          condition: p.condition,
          slug: p.slug,
          allowAuction: p.allowAuction,
          attributes: p.attributes,
        })),
      });
    } catch {
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }

  // 2. API DÀNH RIÊNG CHO SELLER: Xem kho hàng của chính mình (GET /api/v1/products/mine)
  public async getMine(req: Request, res: Response): Promise<void> {
    try {
      if (!this.getSellerProductsUseCase) {
        res
          .status(500)
          .json({ success: false, error: 'GetSellerProductsUseCase chưa được cấu hình.' });
        return;
      }

      const authUser = (req as AuthenticatedRequest).user;
      const sellerId = authUser?.id || (req.query.sellerId as string) || '1';
      const statusFilter = req.query.status as string | undefined;

      const products = await this.getSellerProductsUseCase.execute({
        sellerId,
        status: statusFilter,
      });

      res.status(200).json({
        success: true,
        total: products.length,
        data: products.map((p) => ({
          id: p.id,
          sellerId: p.sellerId,
          sellerName: p.sellerName || 'Nexus Official Store',
          saleType: p.saleType,
          categoryId: p.categoryId,
          title: p.title,
          description: p.description,
          price: p.price,
          currency: 'VND',
          stockQuantity: p.stockQuantity,
          status: p.status,
          images: p.images,
          primaryImage: p.primaryImage,
          condition: p.condition,
          slug: p.slug,
          allowAuction: p.allowAuction,
          attributes: p.attributes,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
      });
    } catch {
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }

  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.params.id as string;
      const product = await this.getProductDetailUseCase.execute(productId);
      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      if (error instanceof ProductNotFoundException) {
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

  //Create
  public async create(req: Request, res: Response): Promise<void> {
    try {
      if (!this.createProductUseCase) {
        res.status(500).json({ success: false, error: 'CreateProductUseCase chưa được cấu hình.' });
        return;
      }

      // Lấy danh tính người bán từ Token đã xác thực
      const authUser = (req as AuthenticatedRequest).user;
      const sellerId = authUser?.id || (req.body.sellerId ? String(req.body.sellerId) : '1');
      const sellerName = authUser?.fullName || req.body.sellerName || 'Nexus Seller';

      const {
        title,
        description,
        price,
        stockQuantity,
        categoryId,
        condition,
        images,
        attributes,
        allowAuction,
      } = req.body;

      if (!title || !description || !categoryId || price === undefined) {
        res.status(400).json({
          success: false,
          error:
            'Vui lòng điền đầy đủ các thông tin bắt buộc: title, description, categoryId, price.',
        });
        return;
      }

      const result = await this.createProductUseCase.execute({
        sellerId,
        sellerName,
        categoryId: String(categoryId),
        title,
        description,
        price: Number(price),
        stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : 1,
        condition,
        images,
        attributes,
        allowAuction,
      });

      res.status(201).json({
        success: true,
        message: 'Tạo sản phẩm mới thành công!',
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Không thể tạo sản phẩm.',
      });
    }
  }

  //UPDATE
  public async update(req: Request, res: Response): Promise<void> {
    try {
      if (!this.updateProductUseCase) {
        res.status(500).json({ success: false, error: 'UpdateProductUseCase chưa được cấu hình.' });
        return;
      }

      const authUser = (req as AuthenticatedRequest).user;
      const sellerId = authUser?.id || (req.body.sellerId ? String(req.body.sellerId) : '1');
      const userRole = authUser?.role;
      const productId = req.params.id as string;

      const {
        title,
        description,
        price,
        stockQuantity,
        categoryId,
        condition,
        status,
        images,
        attributes,
        allowAuction,
      } = req.body;

      const updatedProduct = await this.updateProductUseCase.execute({
        productId,
        sellerId,
        userRole,
        title,
        description,
        price: price !== undefined ? Number(price) : undefined,
        stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : undefined,
        categoryId: categoryId !== undefined ? String(categoryId) : undefined,
        condition,
        status,
        images,
        attributes,
        allowAuction,
      });

      res.status(200).json({
        success: true,
        message: 'Cập nhật sản phẩm thành công!',
        data: {
          id: updatedProduct.id,
          title: updatedProduct.title,
          price: updatedProduct.price,
          stockQuantity: updatedProduct.stockQuantity,
          status: updatedProduct.status,
          updatedAt: updatedProduct.updatedAt,
        },
      });
    } catch (error: any) {
      if (error instanceof ProductNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      if (error?.message?.startsWith('FORBIDDEN')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
        return;
      }
      res.status(400).json({ success: false, error: error?.message || 'Yêu cầu không hợp lệ.' });
    }
  }

  //DELETE
  public async delete(req: Request, res: Response): Promise<void> {
    try {
      if (!this.deleteProductUseCase) {
        res.status(500).json({ success: false, error: 'DeleteProductUseCase chưa được cấu hình.' });
        return;
      }

      const authUser = (req as AuthenticatedRequest).user;
      const sellerId = authUser?.id || (req.body.sellerId ? String(req.body.sellerId) : '1');
      const userRole = authUser?.role;
      const productId = req.params.id as string;

      await this.deleteProductUseCase.execute({
        productId,
        sellerId,
        userRole,
      });

      res.status(200).json({
        success: true,
        message: `Đã xóa thành công sản phẩm với mã ID '${productId}'.`,
      });
    } catch (error: any) {
      if (error instanceof ProductNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      if (error?.message?.startsWith('FORBIDDEN')) {
        res.status(403).json({ success: false, error: error.message.replace('FORBIDDEN: ', '') });
        return;
      }
      res.status(400).json({ success: false, error: error?.message || 'Yêu cầu không hợp lệ.' });
    }
  }
}
