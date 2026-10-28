import { NextFunction, Request, Response, Router } from 'express';
import { CreateProductUseCase } from '../../../application/use-cases/CreateProductUseCase';
import { DeleteProductUseCase } from '../../../application/use-cases/DeleteProductUseCase';
import { UpdateProductUseCase } from '../../../application/use-cases/UpdateProductUseCase';
import { ProductNotFoundException } from '../../../domain/exceptions/ProductNotFoundException';
import { ISellerDirectory, SellerInfo } from '../../../infrastructure/clients/HttpSellerDirectory';
import { AuthenticatedRequest, optionalAuth } from '../../../infrastructure/security/auth';

export interface AdminWriteDeps {
  createProduct: CreateProductUseCase;
  updateProduct: UpdateProductUseCase;
  deleteProduct: DeleteProductUseCase;
  sellerDirectory: ISellerDirectory;
}

type Permission = 'PRODUCT.CREATE' | 'PRODUCT.UPDATE' | 'PRODUCT.DELETE';

function fail(res: Response, status: number, code: string, error: string): void {
  res.status(status).json({ success: false, error, code });
}

/** Quyền lấy từ claim `permissions`/`privileges` của JWT đã được xác thực; không có claim thì dựa vào role ADMIN. */
function tokenPermissions(req: Request): string[] | null {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    const list = payload.permissions ?? payload.privileges;
    return Array.isArray(list) ? list.map(String) : null;
  } catch {
    return null;
  }
}

function sendError(res: Response, error: any): void {
  if (error instanceof ProductNotFoundException) {
    fail(res, 404, 'PRODUCT_NOT_FOUND', error.message);
    return;
  }
  const message: string = error?.message || 'Yêu cầu không hợp lệ.';
  if (message.startsWith('FORBIDDEN')) {
    fail(res, 403, 'FORBIDDEN', message.replace('FORBIDDEN: ', ''));
    return;
  }
  fail(res, 400, 'BAD_REQUEST', message);
}

/**
 * Luồng GHI dành riêng cho Admin (POST/PUT/DELETE /products).
 * Chỉ xử lý khi người gọi là ADMIN; Seller và các vai trò khác được chuyển tiếp nguyên trạng
 * cho router cũ.
 */
export function createCatalogAdminWriteRoutes(deps: AdminWriteDeps): Router {
  const router = Router();

  const adminOnly =
    (permission: Permission) =>
    (req: Request, res: Response, next: NextFunction): void => {
      optionalAuth(req, res, () => {
        const user = (req as AuthenticatedRequest).user;
        if (!user || user.role !== 'ADMIN') {
          next('route');
          return;
        }
        const granted = tokenPermissions(req);
        if (granted && !granted.includes(permission)) {
          fail(res, 403, 'FORBIDDEN', `Thiếu quyền ${permission}.`);
          return;
        }
        next();
      });
    };

  router.post('/', adminOnly('PRODUCT.CREATE'), async (req, res) => {
    const admin = (req as AuthenticatedRequest).user!;
    const body = req.body || {};
    const sellerId =
      typeof body.sellerId === 'string' || typeof body.sellerId === 'number'
        ? String(body.sellerId).trim()
        : '';

    if (!sellerId) {
      return fail(
        res,
        400,
        'VALIDATION_ERROR',
        'Admin cần truyền sellerId của Seller sở hữu sản phẩm.',
      );
    }
    if (!body.title || !body.description || !body.categoryId || body.price === undefined) {
      return fail(
        res,
        400,
        'VALIDATION_ERROR',
        'Vui lòng điền đầy đủ các thông tin bắt buộc: title, description, categoryId, price.',
      );
    }

    const authorization = req.headers.authorization || '';
    let seller: SellerInfo | null = null;
    try {
      if (!authorization) throw new Error('missing token');
      seller = await deps.sellerDirectory.findUser(sellerId, authorization);
    } catch {
      return fail(
        res,
        503,
        'SELLER_VERIFY_UNAVAILABLE',
        'Không xác minh được Seller qua User Service (cần Bearer token hợp lệ).',
      );
    }
    if (!seller) return fail(res, 404, 'SELLER_NOT_FOUND', 'Không tìm thấy Seller.');
    if (seller.role !== 'SELLER') {
      return fail(res, 422, 'NOT_A_SELLER', 'Người dùng được chọn không phải Seller.');
    }
    if (seller.status && seller.status !== 'ACTIVE') {
      return fail(res, 422, 'SELLER_NOT_ACTIVE', 'Tài khoản Seller không ở trạng thái hoạt động.');
    }

    try {
      const result = await deps.createProduct.execute({
        sellerId: seller.id,
        sellerName: seller.fullName,
        categoryId: String(body.categoryId),
        title: body.title,
        description: body.description,
        price: Number(body.price),
        stockQuantity: body.stockQuantity !== undefined ? Number(body.stockQuantity) : 1,
        condition: body.condition,
        images: body.images,
        attributes: body.attributes,
        allowAuction: body.allowAuction,
      });
      console.info(
        `[catalog] admin ${admin.id} created product ${result.id} for seller ${seller.id}`,
      );

      res.status(201).json({
        success: true,
        message: 'Admin đã tạo sản phẩm cho Seller thành công!',
        data: { ...result, sellerId: seller.id },
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.put('/:id', adminOnly('PRODUCT.UPDATE'), async (req, res) => {
    const admin = (req as AuthenticatedRequest).user!;
    const body = req.body || {};
    try {
      const updated = await deps.updateProduct.execute({
        productId: req.params.id as string,
        sellerId: admin.id,
        userRole: 'ADMIN',
        title: body.title,
        description: body.description,
        price: body.price !== undefined ? Number(body.price) : undefined,
        stockQuantity: body.stockQuantity !== undefined ? Number(body.stockQuantity) : undefined,
        categoryId: body.categoryId !== undefined ? String(body.categoryId) : undefined,
        condition: body.condition,
        status: body.status,
        images: body.images,
        attributes: body.attributes,
        allowAuction: body.allowAuction,
      });
      res.status(200).json({
        success: true,
        message: 'Cập nhật sản phẩm thành công!',
        data: {
          id: updated.id,
          sellerId: updated.sellerId,
          title: updated.title,
          status: updated.status,
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.delete('/:id', adminOnly('PRODUCT.DELETE'), async (req, res) => {
    const admin = (req as AuthenticatedRequest).user!;
    try {
      await deps.deleteProduct.execute({
        productId: req.params.id as string,
        sellerId: admin.id,
        userRole: 'ADMIN',
      });
      res.status(200).json({
        success: true,
        message: `Đã xóa thành công sản phẩm với mã ID '${req.params.id}'.`,
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}
