import { Request, Response } from 'express';
import { GetProductDetailUseCase } from '../../../application/use-cases/GetProductDetailUseCase';
import { SearchProductsUseCase } from '../../../application/use-cases/SearchProductsUseCase';
import { CreateProductUseCase } from '../../../application/use-cases/CreateProductUseCase';
import { UpdateProductUseCase } from '../../../application/use-cases/UpdateProductUseCase';
import { ProductNotFoundException } from '../../../domain/exceptions/ProductNotFoundException';
import { ProductConflictException } from '../../../domain/exceptions/ProductConflictException';
import {
  ForbiddenException,
  UnauthorizedException,
} from '../../../domain/exceptions/AuthExceptions';
import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { parseSearchProductsQuery } from '../dtos/SearchProductsQueryDto';
import { parseCreateProductRequest } from '../dtos/CreateProductRequestDto';
import { parseUpdateProductRequest } from '../dtos/UpdateProductRequestDto';
import { AuthenticatedRequest, verifyJwtToken } from '../../../infrastructure/security/auth';
import { Product } from '../../../domain/entities/Product';

export class ProductController {
  constructor(
    private readonly getProductDetailUseCase: GetProductDetailUseCase,
    private readonly productRepository: IProductRepository,
    private readonly searchProductsUseCase: SearchProductsUseCase,
    private readonly createProductUseCase?: CreateProductUseCase,
    private readonly updateProductUseCase?: UpdateProductUseCase,
  ) {}

  /**
   * GET /api/v1/products/search
   * Tìm kiếm sản phẩm theo từ khóa, lọc theo khoảng giá và danh mục.
   */
  public async search(req: Request, res: Response): Promise<void> {
    const validation = parseSearchProductsQuery(req.query as Record<string, unknown>);
    if (!validation.valid) {
      this.sendError(
        res,
        400,
        'INVALID_QUERY',
        validation.error || 'Tham số tìm kiếm không hợp lệ.',
      );
      return;
    }

    try {
      const result = await this.searchProductsUseCase.execute(validation.value);
      res.status(200).json({
        success: true,
        data: result.products.map((product) => this.mapProductToResponse(product)),
        meta: result.meta,
      });
    } catch (error: any) {
      this.sendError(
        res,
        500,
        'INTERNAL_SERVER_ERROR',
        error.message || 'Lỗi xử lý tìm kiếm sản phẩm.',
      );
    }
  }

  /**
   * GET /api/v1/products
   * Lấy danh sách sản phẩm theo hợp đồng FE chờ (SRS 3.3 & Handover Mục 6).
   * Hỗ trợ tìm kiếm không từ khóa, phân trang, lọc theo giá, condition, sort.
   * Xác minh Bearer token khi yêu cầu scope=admin.
   */
  public async getAll(req: Request, res: Response): Promise<void> {
    try {
      const page = Math.max(1, parseInt((req.query.page as string) || '1', 10) || 1);
      const limit = Math.min(
        100,
        Math.max(
          1,
          parseInt(
            (req.query.pageSize as string) ||
              (req.query.limit as string) ||
              (req.query.size as string) ||
              '12',
            10,
          ) || 12,
        ),
      );
      const offset = (page - 1) * limit;

      // Xác minh phiên đăng nhập để kiểm tra scope=admin
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      const userPayload = token ? verifyJwtToken(token) : null;
      const isAdmin = userPayload?.role?.toUpperCase() === 'ADMIN';

      // Quyền truy cập: Chỉ ADMIN mới được dùng scope=admin để xem DRAFT/INACTIVE/AUCTION
      const isScopeAdmin = req.query.scope === 'admin' && isAdmin;

      // Nếu không phải ADMIN, bắt buộc lọc sản phẩm ACTIVE dành cho mua sắm
      const status = isScopeAdmin && req.query.status ? String(req.query.status).trim() : 'ACTIVE';
      const categoryId = req.query.categoryId ? String(req.query.categoryId).trim() : undefined;
      const sellerId = req.query.sellerId ? String(req.query.sellerId).trim() : undefined;
      const condition = req.query.condition ? String(req.query.condition).trim() : undefined;
      const q = req.query.q ? String(req.query.q).trim() : undefined;
      const sort = req.query.sort ? String(req.query.sort).trim() : 'featured';
      const minPrice =
        req.query.minPrice !== undefined && req.query.minPrice !== ''
          ? Number(req.query.minPrice)
          : undefined;
      const maxPrice =
        req.query.maxPrice !== undefined && req.query.maxPrice !== ''
          ? Number(req.query.maxPrice)
          : undefined;

      let products: Product[] = [];
      let total = 0;

      if (this.productRepository.findFiltered) {
        const filtered = await this.productRepository.findFiltered({
          offset,
          limit,
          categoryId,
          sellerId,
          status,
          condition,
          minPrice: isNaN(minPrice!) ? undefined : minPrice,
          maxPrice: isNaN(maxPrice!) ? undefined : maxPrice,
          q,
          sort,
        });
        products = filtered.products;
        total = filtered.total;
      } else {
        products = await this.productRepository.findAll(limit, offset);
        total = products.length;
      }

      const items = products.map((p) => this.mapProductToResponse(p));

      // Trả về contract chuẩn: { success: true, data: { items, page, pageSize, total } }
      if (req.query.format === 'legacy_array') {
        res.status(200).json({
          success: true,
          data: items,
          meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
        });
      } else {
        res.status(200).json({
          success: true,
          data: {
            items,
            page,
            pageSize: limit,
            total,
          },
        });
      }
    } catch (error: any) {
      this.sendError(
        res,
        500,
        'INTERNAL_SERVER_ERROR',
        error.message || 'Lỗi truy xuất danh sách sản phẩm.',
      );
    }
  }

  /**
   * GET /api/v1/products/:id
   * Xem chi tiết sản phẩm theo ID hoặc Slug.
   */
  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.params.id as string;
      const product = await this.productRepository.findById(productId);

      if (!product) {
        this.sendError(res, 404, 'NOT_FOUND', `Không tìm thấy sản phẩm với mã: ${productId}`);
        return;
      }

      res.status(200).json({
        success: true,
        data: this.mapProductToResponse(product),
      });
    } catch (error: any) {
      this.sendError(
        res,
        500,
        'INTERNAL_SERVER_ERROR',
        error.message || 'Lỗi truy xuất chi tiết sản phẩm.',
      );
    }
  }

  /**
   * POST /api/v1/products
   * Tạo sản phẩm mới, kiểm tra quyền Seller/Admin, kiểm tra category hoạt động và lưu DB.
   */
  public async create(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;

    if (!user || !user.sub) {
      this.sendError(
        res,
        401,
        'UNAUTHORIZED',
        'Yêu cầu đăng nhập tài khoản Người bán (SELLER) hoặc Quản trị viên (ADMIN).',
      );
      return;
    }

    const validation = parseCreateProductRequest(req.body);
    if (!validation.valid || !validation.value) {
      this.sendError(
        res,
        400,
        'VALIDATION_ERROR',
        validation.error || 'Dữ liệu sản phẩm không hợp lệ.',
        validation.fieldErrors,
      );
      return;
    }

    if (!this.createProductUseCase) {
      this.sendError(
        res,
        501,
        'NOT_IMPLEMENTED',
        'Chức năng tạo sản phẩm chưa được kích hoạt trên hệ thống.',
      );
      return;
    }

    try {
      const created = await this.createProductUseCase.execute(validation.value, {
        userId: user.sub,
        userRole: user.role,
      });

      res.status(201).json({
        success: true,
        message: 'Tạo sản phẩm thành công.',
        data: this.mapProductToResponse(created),
      });
    } catch (error: any) {
      this.sendError(res, 400, 'CREATE_PRODUCT_FAILED', error.message || 'Không thể tạo sản phẩm.');
    }
  }

  /**
   * PATCH /api/v1/products/:id
   * Chỉnh sửa sản phẩm, kiểm tra quyền sở hữu, xử lý xung đột và khóa phiên đấu giá.
   */
  public async update(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;

    if (!user || !user.sub) {
      this.sendError(res, 401, 'UNAUTHORIZED', 'Yêu cầu đăng nhập để cập nhật sản phẩm.');
      return;
    }

    const productId = req.params.id as string;
    const validation = parseUpdateProductRequest(req.body);

    if (!validation.valid || !validation.value) {
      this.sendError(
        res,
        400,
        'VALIDATION_ERROR',
        validation.error || 'Dữ liệu cập nhật sản phẩm chưa hợp lệ.',
        validation.fieldErrors,
      );
      return;
    }

    // Nhận header If-Unmodified-Since nếu client gửi qua header
    if (!validation.value.expectedUpdatedAt && req.headers['if-unmodified-since']) {
      validation.value.expectedUpdatedAt = req.headers['if-unmodified-since'] as string;
    }

    if (!this.updateProductUseCase) {
      this.sendError(
        res,
        501,
        'NOT_IMPLEMENTED',
        'Chức năng cập nhật sản phẩm chưa được kích hoạt.',
      );
      return;
    }

    try {
      const updated = await this.updateProductUseCase.execute(productId, validation.value, {
        sub: user.sub,
        role: user.role,
      });

      res.status(200).json({
        success: true,
        message: 'Cập nhật sản phẩm thành công.',
        data: this.mapProductToResponse(updated),
      });
    } catch (error: any) {
      if (error instanceof ProductNotFoundException) {
        this.sendError(res, 404, 'NOT_FOUND', error.message);
        return;
      }
      if (error instanceof ProductConflictException) {
        res.status(409).json({
          success: false,
          error: error.message,
          code: error.code,
          message: error.message,
          fieldErrors: {},
          data: {
            currentUpdatedAt: error.currentUpdatedAt,
            providedUpdatedAt: error.providedUpdatedAt,
          },
        });
        return;
      }
      if (error instanceof ForbiddenException) {
        this.sendError(res, 403, 'FORBIDDEN', error.message);
        return;
      }
      if (error instanceof UnauthorizedException) {
        this.sendError(res, 401, 'UNAUTHORIZED', error.message);
        return;
      }

      this.sendError(
        res,
        400,
        'UPDATE_PRODUCT_FAILED',
        error.message || 'Không thể cập nhật sản phẩm.',
      );
    }
  }

  private mapProductToResponse(p: Product): Record<string, unknown> {
    const categoryName = p.categoryName || 'Thiết bị điện tử';
    const sellerName = p.sellerName || 'Nexus Official Store';
    const saleType = p.allowAuction ? 'AUCTION' : 'FIXED_PRICE';
    const priceNum = Number(p.price);

    return {
      id: String(p.id),
      title: p.title,
      description: p.description,
      categoryId: String(p.categoryId),
      categoryName,
      sellerId: String(p.sellerId),
      sellerName,
      images: p.images,
      primaryImage: p.primaryImage || (p.images.length > 0 ? p.images[0] : undefined),
      price: isNaN(priceNum) ? p.price : priceNum,
      currency: p.currency || 'VND',
      condition: p.condition || 'NEW',
      saleType,
      status: p.status,
      stockQuantity: p.stockQuantity,
      slug: p.slug,
      allowAuction: p.allowAuction,
      attributes: p.attributes,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  private sendError(
    res: Response,
    status: number,
    code: string,
    message: string,
    fieldErrors: Record<string, string> = {},
  ): void {
    res.status(status).json({
      success: false,
      error: message,
      code,
      message,
      fieldErrors,
    });
  }
}
