import { Request, Response } from 'express';
import { GetProductDetailUseCase } from '../../../application/use-cases/GetProductDetailUseCase';
import { ProductNotFoundException } from '../../../domain/exceptions/ProductNotFoundException';
import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { SearchProductsUseCase } from '../../../application/use-cases/SearchProductsUseCase';
import { parseSearchProductsQuery } from '../dtos/SearchProductsQueryDto';
import { UpdateProductUseCase } from '../../../application/use-cases/UpdateProductUseCase';
import { CreateProductUseCase } from '../../../application/use-cases/CreateProductUseCase';
import { AuthenticatedRequest, verifiedAccessUser } from '../../../infrastructure/security/auth';
import { DeleteProductUseCase } from '../../../application/use-cases/DeleteProductUseCase';
import { GetSellerProductsUseCase } from '../../../application/use-cases/GetSellerProductsUseCase';
import { RecoverProductUseCase } from '../../../application/use-cases/RecoverProductUseCase';
import { ISellerDirectory } from '../../../infrastructure/clients/HttpSellerDirectory';
import { ListCatalogProductsUseCase } from '../../../application/use-cases/ListCatalogProductsUseCase';
import { ProductStatus } from '../../../domain/entities/Product';
import { DeductProductStockUseCase } from '../../../application/use-cases/DeductProductStockUseCase';
import { CreateProductReviewUseCase } from '../../../application/use-cases/CreateProductReviewUseCase';
import { GetProductReviewsUseCase } from '../../../application/use-cases/GetProductReviewsUseCase';

export class ProductController {
  constructor(
    private readonly getProductDetailUseCase: GetProductDetailUseCase,
    private readonly productRepository: IProductRepository,
    private readonly searchProductsUseCase: SearchProductsUseCase,
    private readonly createProductUseCase?: CreateProductUseCase,
    private readonly updateProductUseCase?: UpdateProductUseCase,
    private readonly deleteProductUseCase?: DeleteProductUseCase,
    private readonly getSellerProductsUseCase?: GetSellerProductsUseCase,
    private readonly recoverProductUseCase?: RecoverProductUseCase,
    private readonly sellerDirectory?: ISellerDirectory,
    private readonly listCatalogProductsUseCase?: ListCatalogProductsUseCase,
    private readonly deductProductStockUseCase?: DeductProductStockUseCase,
    private readonly createProductReviewUseCase?: CreateProductReviewUseCase,
    private readonly getProductReviewsUseCase?: GetProductReviewsUseCase,
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

  // GET /api/v1/products - Danh sach san pham (Buyer & Admin)
  public async getAll(req: Request, res: Response): Promise<void> {
    try {
      const adminScope = req.query.scope === 'admin';
      const authUser = adminScope ? verifiedAccessUser(req) : (req as AuthenticatedRequest).user;

      // 1. Kiem tra quyen neu la Admin (?scope=admin)
      if (adminScope) {
        if (!authUser) {
          res
            .status(401)
            .json({ success: false, code: 'UNAUTHORIZED', error: 'Vui lòng đăng nhập.' });
          return;
        }
        if (authUser.role !== 'ADMIN' && !authUser.roles?.includes('ADMIN')) {
          res
            .status(403)
            .json({ success: false, code: 'FORBIDDEN', error: 'Chỉ Admin được dùng scope=admin.' });
          return;
        }
      }

      // 2. Xu ly phan trang va bo loc SQL
      if (this.listCatalogProductsUseCase) {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const sort = String(req.query.sort || 'newest') as any;
        const minPrice = req.query.minPrice !== undefined ? Number(req.query.minPrice) : undefined;
        const maxPrice = req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : undefined;
        const categoryId = req.query.categoryId ? String(req.query.categoryId) : undefined;
        const condition = req.query.condition ? String(req.query.condition) : undefined;
        const status =
          adminScope && req.query.status ? (String(req.query.status) as ProductStatus) : undefined;
        const saleType = req.query.saleType ? (String(req.query.saleType) as any) : undefined;
        const q = req.query.q ? String(req.query.q) : undefined;

        // Buyer: chi lay ACTIVE con ton kho. Admin: lay tat ca trang thai.
        const result = await this.listCatalogProductsUseCase.execute({
          scope: adminScope ? 'admin' : 'buyer',
          q,
          categoryId,
          minPrice,
          maxPrice,
          condition,
          status,
          saleType,
          sort,
          page,
          limit,
        });

        // Tra ve ket qua kem metadata phan trang cho Frontend
        res.status(200).json({
          success: true,
          data: result.products.map((p) => ({
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
          meta: result.meta,
        });
        return;
      }

      // 3. Fallback danh sach in-memory cu
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

  // GET /api/v1/products/:id - Chi tiet san pham
  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.params.id as string;
      const authUser = verifiedAccessUser(req);
      const product = await this.getProductDetailUseCase.execute(productId);

      const isPrivileged = authUser &&
        (authUser.role === 'ADMIN' || authUser.roles?.includes('ADMIN') || authUser.id === product.sellerId);
      if (
        !isPrivileged &&
        (product.status !== ProductStatus.ACTIVE || product.stockQuantity <= 0)
      ) {
        res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          error: `Không tìm thấy sản phẩm với ID '${productId}'.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      if (error instanceof ProductNotFoundException) {
        res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
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

  // CREATE
  public async create(req: Request, res: Response): Promise<void> {
    try {
      if (!this.createProductUseCase) {
        res.status(500).json({ success: false, error: 'CreateProductUseCase chưa được cấu hình.' });
        return;
      }

      const authUser = (req as AuthenticatedRequest).user;
      let sellerId = authUser?.id || '';
      let sellerName = authUser?.fullName || 'Nexus Seller';

      // 🛡️ NẾU LÀ ADMIN TẠO GIÙM CHO SELLER:
      if (authUser?.role === 'ADMIN') {
        const targetSellerId = req.body.sellerId ? String(req.body.sellerId).trim() : '';
        if (!targetSellerId) {
          res.status(400).json({
            success: false,
            code: 'VALIDATION_ERROR',
            error: 'Admin cần truyền sellerId của Seller sở hữu sản phẩm.',
          });
          return;
        }

        // Gọi User Service xác minh Seller có tồn tại và đang ACTIVE không
        if (this.sellerDirectory) {
          const authorization = req.headers.authorization || '';
          try {
            const seller = await this.sellerDirectory.findUser(targetSellerId, authorization);
            if (!seller) {
              res.status(404).json({
                success: false,
                code: 'SELLER_NOT_FOUND',
                error: 'Không tìm thấy Seller.',
              });
              return;
            }
            if (seller.role !== 'SELLER') {
              res.status(422).json({
                success: false,
                code: 'NOT_A_SELLER',
                error: 'Người dùng được chọn không phải Seller.',
              });
              return;
            }
            if (seller.status && seller.status !== 'ACTIVE') {
              res.status(422).json({
                success: false,
                code: 'SELLER_NOT_ACTIVE',
                error: 'Tài khoản Seller không ở trạng thái hoạt động.',
              });
              return;
            }
            sellerId = seller.id;
            sellerName = seller.fullName;
          } catch {
            res.status(503).json({
              success: false,
              code: 'SELLER_VERIFY_UNAVAILABLE',
              error: 'Không xác minh được Seller qua User Service.',
            });
            return;
          }
        } else {
          sellerId = targetSellerId;
          sellerName = req.body.sellerName || 'Nexus Seller';
        }
      }

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
          code: 'VALIDATION_ERROR',
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
        message:
          authUser?.role === 'ADMIN'
            ? 'Admin đã tạo sản phẩm cho Seller thành công!'
            : 'Tạo sản phẩm mới thành công!',
        data: {
          ...result,
          sellerId,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        code: 'BAD_REQUEST',
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

  // RECOVER: Khôi phục sản phẩm đã xóa mềm
  public async recover(req: Request, res: Response): Promise<void> {
    try {
      if (!this.recoverProductUseCase) {
        res
          .status(500)
          .json({ success: false, error: 'RecoverProductUseCase chưa được cấu hình.' });
        return;
      }

      const authUser = (req as AuthenticatedRequest).user;
      const sellerId = authUser?.id || (req.body?.sellerId ? String(req.body.sellerId) : '1');
      const userRole = authUser?.role;
      const productId = req.params.id as string;

      // Gọi qua Use Case chuẩn Clean Architecture
      await this.recoverProductUseCase.execute({
        productId,
        sellerId,
        userRole,
      });

      res.status(200).json({
        success: true,
        message: `Đã khôi phục thành công sản phẩm với mã ID '${productId}'.`,
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

  public deductStock = async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = String(req.params.id);
      if (!this.deductProductStockUseCase) {
        res
          .status(500)
          .json({ success: false, error: 'DeductProductStockUseCase is not configured' });
        return;
      }
      const { quantity, orderId, reason } = req.body;

      const result = await this.deductProductStockUseCase.execute({
        productId,
        quantity: Number(quantity),
        orderId,
        reason,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error.message?.includes('Insufficient stock')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Lỗi khi trừ tồn kho sản phẩm.',
      });
    }
  };

  public createReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      if (!authUser || !authUser.id) {
        res
          .status(401)
          .json({ success: false, error: 'Unauthorized: Bạn cần đăng nhập để đánh giá sản phẩm.' });
        return;
      }

      if (!this.createProductReviewUseCase) {
        res
          .status(500)
          .json({ success: false, error: 'CreateProductReviewUseCase is not configured.' });
        return;
      }

      const productId = String(req.params.id);
      const { rating, comment } = req.body;

      const review = await this.createProductReviewUseCase.execute({
        productId,
        userId: authUser.id,
        userName: authUser.fullName || 'Người mua',
        rating: Number(rating),
        comment,
      });

      res.status(201).json({
        success: true,
        data: {
          id: review.id,
          productId: review.productId,
          userId: review.userId,
          userName: review.userName,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt,
        },
      });
    } catch (error: any) {
      if (error instanceof ProductNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      res.status(400).json({ success: false, error: error.message || 'Lỗi khi gửi đánh giá.' });
    }
  };

  public getReviews = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.getProductReviewsUseCase) {
        res
          .status(500)
          .json({ success: false, error: 'GetProductReviewsUseCase is not configured.' });
        return;
      }

      const productId = String(req.params.id);
      const result = await this.getProductReviewsUseCase.execute(productId);

      res.status(200).json({
        success: true,
        data: {
          productId: result.productId,
          totalReviews: result.totalReviews,
          averageRating: result.averageRating,
          reviews: result.reviews.map((r) => ({
            id: r.id,
            productId: r.productId,
            userId: r.userId,
            userName: r.userName,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt,
          })),
        },
      });
    } catch (error: any) {
      if (error instanceof ProductNotFoundException) {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      res
        .status(400)
        .json({ success: false, error: error.message || 'Lỗi khi lấy danh sách đánh giá.' });
    }
  };
}
