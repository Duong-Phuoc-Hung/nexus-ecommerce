import { NextFunction, Request, Response, Router } from 'express';
import { ProductStatus } from '../../../domain/entities/Product';
import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { InMemoryCatalogQuery } from '../../../infrastructure/repositories/InMemoryCatalogQuery';
import {
  CatalogSort,
  ICatalogQuery,
  ListCatalogProductsQuery,
  ListCatalogProductsUseCase,
} from '../../../application/use-cases/ListCatalogProductsUseCase';
import { AuthenticatedRequest, optionalAuth } from '../../../infrastructure/security/auth';

const SORTS: CatalogSort[] = ['newest', 'oldest', 'price_asc', 'price_desc'];

type Parsed = { ok: true; value: ListCatalogProductsQuery } | { ok: false; error: string };

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readPositiveInt(value: unknown, fallback: number, name: string): number | string {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) < 1) {
    return `Query parameter "${name}" must be a positive integer.`;
  }
  return Number(value);
}

function readPrice(value: unknown, name: string): number | undefined | string {
  if (value === undefined) return undefined;
  const parsed = typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || parsed < 0) {
    return `Query parameter "${name}" must be a non-negative number.`;
  }
  return parsed;
}

function parseQuery(query: Request['query'], scope: 'buyer' | 'admin'): Parsed {
  const page = readPositiveInt(query.page, 1, 'page');
  if (typeof page === 'string') return { ok: false, error: page };
  const limit = readPositiveInt(query.limit, 20, 'limit');
  if (typeof limit === 'string') return { ok: false, error: limit };
  if (limit > 100) return { ok: false, error: 'Query parameter "limit" must not exceed 100.' };

  const minPrice = readPrice(query.minPrice, 'minPrice');
  if (typeof minPrice === 'string') return { ok: false, error: minPrice };
  const maxPrice = readPrice(query.maxPrice, 'maxPrice');
  if (typeof maxPrice === 'string') return { ok: false, error: maxPrice };
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    return { ok: false, error: 'Query parameter "minPrice" must not exceed "maxPrice".' };
  }

  const sort = (readString(query.sort) || 'newest') as CatalogSort;
  if (!SORTS.includes(sort)) {
    return { ok: false, error: `Query parameter "sort" must be one of: ${SORTS.join(', ')}.` };
  }

  const status = readString(query.status);
  if (status && !Object.values(ProductStatus).includes(status as ProductStatus)) {
    return { ok: false, error: 'Query parameter "status" is invalid.' };
  }

  const saleType = readString(query.saleType);
  if (saleType && saleType !== 'FIXED_PRICE' && saleType !== 'AUCTION') {
    return { ok: false, error: 'Query parameter "saleType" must be FIXED_PRICE or AUCTION.' };
  }

  return {
    ok: true,
    value: {
      scope,
      q: readString(query.q),
      categoryId: readString(query.categoryId),
      minPrice,
      maxPrice,
      condition: readString(query.condition),
      status: scope === 'admin' ? (status as ProductStatus | undefined) : undefined,
      saleType: saleType as ListCatalogProductsQuery['saleType'],
      sort,
      page,
      limit,
    },
  };
}

/**
 * Bảo vệ các GET công khai của Catalog cho Buyer/khách và phạm vi Admin.
 * Seller, Staff và các vai trò khác được chuyển tiếp nguyên trạng cho router cũ.
 */
export function createCatalogAccessRoutes(
  productRepository: IProductRepository,
  catalogQuery: ICatalogQuery = new InMemoryCatalogQuery(productRepository),
): Router {
  const router = Router();
  const listUseCase = new ListCatalogProductsUseCase(catalogQuery);

  const adminScopeGuard = (req: Request, res: Response): boolean => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ success: false, error: 'Vui lòng đăng nhập.', code: 'UNAUTHORIZED' });
      return false;
    }
    if (user.role !== 'ADMIN') {
      res
        .status(403)
        .json({ success: false, error: 'Chỉ Admin được dùng scope=admin.', code: 'FORBIDDEN' });
      return false;
    }
    return true;
  };

  const handleList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    const adminScope = req.query.scope === 'admin';

    if (adminScope) {
      if (!adminScopeGuard(req, res)) return;
    } else if (user && user.role !== 'BUYER') {
      next();
      return;
    }

    const parsed = parseQuery(req.query, adminScope ? 'admin' : 'buyer');
    if (!parsed.ok) {
      res.status(400).json({ success: false, error: parsed.error, code: 'VALIDATION_ERROR' });
      return;
    }

    try {
      const result = await listUseCase.execute(parsed.value);
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
    } catch {
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  };

  router.get('/', optionalAuth, (req, res, next) => void handleList(req, res, next));
  router.get('/search', optionalAuth, (req, res, next) => {
    // Không có q: giữ nguyên hợp đồng cũ (400) do router gốc xử lý.
    if (!readString(req.query.q) && req.query.scope !== 'admin') {
      next();
      return;
    }
    void handleList(req, res, next);
  });

  router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
    if (req.params.id === 'mine' || req.params.id === 'search') {
      next();
      return;
    }

    const user = (req as AuthenticatedRequest).user;
    if (req.query.scope === 'admin') {
      if (adminScopeGuard(req, res)) next();
      return;
    }
    if (user && user.role !== 'BUYER') {
      next();
      return;
    }

    try {
      const product = await productRepository.findById(req.params.id as string);
      if (product && product.status === ProductStatus.ACTIVE && product.stockQuantity > 0) {
        next();
        return;
      }
      res.status(404).json({
        success: false,
        error: `Không tìm thấy sản phẩm với ID '${req.params.id}'.`,
        code: 'NOT_FOUND',
      });
    } catch {
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  });

  return router;
}
