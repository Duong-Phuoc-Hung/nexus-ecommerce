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
import {
  InvalidSellerAccountError,
  UserDirectoryUnavailableError,
} from '../../../application/ports/IUserDirectory';
import { Product, ProductStatus } from '../../../domain/entities/Product';

function productResponse(product: Product) {
  return {
    id: product.id,
    sellerId: product.sellerId,
    sellerName: product.sellerName || 'Nexus Official Store',
    saleType: product.saleType,
    categoryId: product.categoryId,
    title: product.title,
    description: product.description,
    price: product.price,
    currency: 'VND',
    stockQuantity: product.stockQuantity,
    status: product.status,
    images: product.images,
    primaryImage: product.primaryImage,
    condition: product.condition,
    slug: product.slug,
    allowAuction: product.allowAuction,
    attributes: product.attributes,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function bearerToken(req: Request): string {
  const authorization = req.headers.authorization || '';
  return authorization.replace(/^Bearer\s+/i, '').trim();
}

function isProductStatus(value: unknown): value is ProductStatus {
  return typeof value === 'string' && Object.values(ProductStatus).some((status) => status === value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === 'string')
  );
}

function validateProductBody(body: Record<string, unknown>, creating: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  const requiredTextFields = ['title', 'description', 'categoryId'] as const;
  for (const field of requiredTextFields) {
    const value = body[field];
    if ((creating || value !== undefined) && (typeof value !== 'string' || !value.trim())) {
      errors[field] = 'Trường này là bắt buộc và phải là chuỗi không rỗng.';
    }
  }

  if (creating || body.price !== undefined) {
    const price = Number(body.price);
    if (
      body.price === undefined ||
      body.price === null ||
      body.price === '' ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !/^\d+(\.\d{1,2})?$/.test(String(body.price).trim())
    ) {
      errors.price = 'Giá phải lớn hơn 0 và có tối đa 2 chữ số thập phân.';
    }
  }

  if (body.stockQuantity !== undefined) {
    const stock = Number(body.stockQuantity);
    if (!Number.isSafeInteger(stock) || stock < 0) {
      errors.stockQuantity = 'Số lượng phải là số nguyên không âm.';
    }
  }

  if (
    body.condition !== undefined &&
    (typeof body.condition !== 'string' ||
      !['NEW', 'LIKE_NEW', 'USED', 'REFURBISHED'].includes(body.condition))
  ) {
    errors.condition = 'Tình trạng sản phẩm không hợp lệ.';
  }

  if (body.status !== undefined && !isProductStatus(body.status)) {
    errors.status = 'Trạng thái sản phẩm không hợp lệ.';
  }

  if (body.allowAuction !== undefined && typeof body.allowAuction !== 'boolean') {
    errors.allowAuction = 'allowAuction phải là boolean.';
  }

  if (body.images !== undefined) {
    if (!Array.isArray(body.images) || body.images.length > 5) {
      errors.images = 'Sản phẩm được phép có tối đa 5 ảnh.';
    } else if (
      body.images.some((image) => {
        if (typeof image !== 'string') return true;
        try {
          const url = new URL(image);
          return url.protocol !== 'http:' && url.protocol !== 'https:';
        } catch {
          return true;
        }
      })
    ) {
      errors.images = 'Mỗi ảnh cần một URL HTTP hoặc HTTPS hợp lệ.';
    }
  }

  if (body.attributes !== undefined && !isStringRecord(body.attributes)) {
    errors.attributes = 'attributes phải là object có giá trị dạng chuỗi.';
  }

  return errors;
}

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

  private resolveVisibility(
    req: Request,
    res: Response,
  ): 'PUBLIC' | 'ADMIN' | null {
    const scope = req.query.scope;
    if (scope === undefined) return 'PUBLIC';
    if (scope !== 'admin') {
      res.status(400).json({
        success: false,
        error: 'Query parameter "scope" must be "admin" when provided.',
        code: 'VALIDATION_ERROR',
      });
      return null;
    }

    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication is required for the admin product scope.',
        code: 'UNAUTHENTICATED',
      });
      return null;
    }
    if (user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'Only Admin can access the admin product scope.',
        code: 'FORBIDDEN',
      });
      return null;
    }
    return 'ADMIN';
  }

  public async search(req: Request, res: Response): Promise<void> {
    const visibility = this.resolveVisibility(req, res);
    if (!visibility) return;

    const validation = parseSearchProductsQuery(
      req.query as Record<string, unknown>,
      visibility,
    );
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.error,
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    try {
      const result = await this.searchProductsUseCase.execute(validation.value);
      const items = result.products.map(productResponse);
      res.status(200).json({
        success: true,
        data: {
          items,
          page: result.meta.page,
          pageSize: result.meta.limit,
          total: result.meta.total,
          totalPages: result.meta.totalPages,
        },
        meta: result.meta,
      });
    } catch (error) {
      console.error('[Catalog Product Search Error]:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  public async getAll(req: Request, res: Response): Promise<void> {
    const visibility = this.resolveVisibility(req, res);
    if (!visibility) return;

    const validation = parseSearchProductsQuery(
      req.query as Record<string, unknown>,
      visibility,
    );
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.error,
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    try {
      const result = await this.searchProductsUseCase.execute(validation.value);
      res.status(200).json({
        success: true,
        data: {
          items: result.products.map(productResponse),
          page: result.meta.page,
          pageSize: result.meta.limit,
          total: result.meta.total,
          totalPages: result.meta.totalPages,
        },
        meta: result.meta,
      });
    } catch (error) {
      console.error('[Catalog Product List Error]:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
      });
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
      const user = (req as AuthenticatedRequest).user;
      if (
        user?.role !== 'ADMIN' &&
        (product.status !== 'ACTIVE' || product.stockQuantity <= 0)
      ) {
        res.status(404).json({
          success: false,
          error: `Product with ID "${productId}" was not found.`,
          code: 'NOT_FOUND',
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
          error: error.message,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  //Create
  public async create(req: Request, res: Response): Promise<void> {
    try {
      if (!this.createProductUseCase) {
        res.status(500).json({
          success: false,
          error: 'CreateProductUseCase chưa được cấu hình.',
          code: 'INTERNAL_ERROR',
        });
        return;
      }

      const authUser = (req as AuthenticatedRequest).user;
      if (!authUser) {
        res.status(401).json({
          success: false,
          error: 'Authentication is required.',
          code: 'UNAUTHENTICATED',
        });
        return;
      }

      const body =
        req.body && typeof req.body === 'object'
          ? (req.body as Record<string, unknown>)
          : {};
      const fieldErrors = validateProductBody(body, true);
      if (authUser.role === 'ADMIN' && (typeof body.sellerId !== 'string' || !body.sellerId.trim())) {
        fieldErrors.sellerId = 'Admin phải chọn sellerId cho sản phẩm.';
      }
      if (Object.keys(fieldErrors).length > 0) {
        res.status(400).json({
          success: false,
          error: 'Dữ liệu sản phẩm không hợp lệ.',
          code: 'VALIDATION_ERROR',
          fieldErrors,
        });
        return;
      }

      const sellerId =
        authUser.role === 'ADMIN' ? String(body.sellerId).trim() : authUser.id;

      const result = await this.createProductUseCase.execute({
        sellerId,
        sellerName: authUser.role === 'ADMIN' ? undefined : authUser.fullName,
        categoryId: String(body.categoryId).trim(),
        title: String(body.title),
        description: String(body.description),
        price: Number(body.price),
        stockQuantity:
          body.stockQuantity !== undefined ? Number(body.stockQuantity) : 1,
        condition: typeof body.condition === 'string' ? body.condition : undefined,
        images: Array.isArray(body.images) ? body.images : undefined,
        attributes: isStringRecord(body.attributes) ? body.attributes : undefined,
        allowAuction: typeof body.allowAuction === 'boolean' ? body.allowAuction : undefined,
        status: authUser.role === 'ADMIN' && isProductStatus(body.status) ? body.status : undefined,
        userRole: authUser.role,
        accessToken: bearerToken(req),
      });

      res.status(201).json({
        success: true,
        message: 'Tạo sản phẩm mới thành công!',
        data: result,
      });
    } catch (error) {
      if (error instanceof UserDirectoryUnavailableError) {
        res.status(503).json({
          success: false,
          error: error.message,
          code: 'DEPENDENCY_UNAVAILABLE',
        });
        return;
      }
      if (error instanceof InvalidSellerAccountError) {
        res.status(422).json({
          success: false,
          error: error.message,
          code: 'INVALID_SELLER',
          fieldErrors: { sellerId: error.message },
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Không thể tạo sản phẩm.',
        code: 'VALIDATION_ERROR',
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
      if (!authUser) {
        res.status(401).json({
          success: false,
          error: 'Authentication is required.',
          code: 'UNAUTHENTICATED',
        });
        return;
      }
      const body =
        req.body && typeof req.body === 'object'
          ? (req.body as Record<string, unknown>)
          : {};
      const fieldErrors = validateProductBody(body, false);
      if (Object.keys(fieldErrors).length > 0) {
        res.status(400).json({
          success: false,
          error: 'Dữ liệu sản phẩm không hợp lệ.',
          code: 'VALIDATION_ERROR',
          fieldErrors,
        });
        return;
      }

      const sellerId = authUser.id;
      const userRole = authUser?.role;
      const productId = req.params.id as string;

      const updatedProduct = await this.updateProductUseCase.execute({
        productId,
        sellerId,
        userRole,
        title: typeof body.title === 'string' ? body.title : undefined,
        description: typeof body.description === 'string' ? body.description : undefined,
        price: body.price !== undefined ? Number(body.price) : undefined,
        stockQuantity:
          body.stockQuantity !== undefined ? Number(body.stockQuantity) : undefined,
        categoryId:
          body.categoryId !== undefined ? String(body.categoryId).trim() : undefined,
        condition: typeof body.condition === 'string' ? body.condition : undefined,
        status: isProductStatus(body.status) ? body.status : undefined,
        images: Array.isArray(body.images) ? body.images : undefined,
        attributes: isStringRecord(body.attributes) ? body.attributes : undefined,
        allowAuction: typeof body.allowAuction === 'boolean' ? body.allowAuction : undefined,
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (error instanceof ProductNotFoundException) {
        res.status(404).json({ success: false, error: error.message, code: 'NOT_FOUND' });
        return;
      }
      if (message.startsWith('FORBIDDEN')) {
        res.status(403).json({
          success: false,
          error: message.replace('FORBIDDEN: ', ''),
          code: 'FORBIDDEN',
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: message || 'Yêu cầu không hợp lệ.',
        code: 'VALIDATION_ERROR',
      });
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
      if (!authUser) {
        res.status(401).json({
          success: false,
          error: 'Authentication is required.',
          code: 'UNAUTHENTICATED',
        });
        return;
      }
      const sellerId = authUser.id;
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (error instanceof ProductNotFoundException) {
        res.status(404).json({ success: false, error: error.message, code: 'NOT_FOUND' });
        return;
      }
      if (message.startsWith('FORBIDDEN')) {
        res.status(403).json({
          success: false,
          error: message.replace('FORBIDDEN: ', ''),
          code: 'FORBIDDEN',
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: message || 'Yêu cầu không hợp lệ.',
        code: 'VALIDATION_ERROR',
      });
    }
  }
}
