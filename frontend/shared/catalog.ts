import { ApiError, unwrap, type RequestApi } from './http';
import fixtures from './fixtures/catalog.json';

export type CatalogCategory = { id: string; name: string; parentId: string | null; level: number };
export type CatalogProduct = {
  id: string;
  title: string;
  description: string;
  images: string[];
  price: number | null;
  currency: string | null;
  categoryId: string;
  categoryName: string;
  sellerId: string;
  sellerName: string;
  condition: string;
  status: string;
  saleType: 'FIXED_PRICE' | 'AUCTION' | 'UNKNOWN';
  stockQuantity: number | null;
  rating?: number;
  soldCount?: number;
};
export type CatalogQuery = {
  q: string;
  categoryId: string;
  minPrice: string;
  maxPrice: string;
  condition: string;
  sort: string;
  page: number;
  pageSize: number;
  scope?: 'admin';
  status?: string;
};
export type CatalogPage = {
  items: CatalogProduct[];
  page: number;
  pageSize: number;
  total: number | null;
  totalPages: number | null;
  querySupported: boolean;
};
export type ProductInput = {
  title: string;
  description: string;
  categoryId: string;
  sellerId?: string;
  price: string;
  currency: string;
  condition: string;
  images: string[];
  status: string;
  saleType: string;
};
type Row = Record<string, unknown>;
function obj(value: unknown): Row {
  return value && typeof value === 'object' ? (value as Row) : {};
}
function id(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}
function number(value: unknown): number | null {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
export function normalizeProduct(value: unknown): CatalogProduct {
  const r = obj(value);
  const seller = obj(r.sellerSummary ?? r.seller);
  const category = obj(r.category);
  if (!id(r.id) || typeof (r.title ?? r.name) !== 'string')
    throw new ApiError('Thông tin sản phẩm chưa đầy đủ.', undefined, 'INVALID_PRODUCT');
  const images = Array.isArray(r.images)
    ? r.images
        .map((v) => (typeof v === 'string' ? v : id(obj(v).url ?? obj(v).imageUrl)))
        .filter(Boolean)
    : typeof r.imageUrl === 'string'
      ? [r.imageUrl]
      : [];
  const saleType = String(r.saleType ?? r.listingType ?? '').toUpperCase();
  return {
    id: id(r.id),
    title: String(r.title ?? r.name),
    description: typeof r.description === 'string' ? r.description : '',
    images,
    price: number(r.price ?? r.basePrice),
    currency: typeof r.currency === 'string' && /^[A-Z]{3}$/.test(r.currency) ? r.currency : null,
    categoryId: id(r.categoryId ?? category.id),
    categoryName: id(r.categoryName ?? category.name),
    sellerId: id(r.sellerId ?? seller.id),
    sellerName: id(seller.fullName ?? seller.name ?? r.sellerName),
    condition: id(r.condition),
    status: id(r.status).toUpperCase(),
    saleType:
      saleType === 'AUCTION'
        ? 'AUCTION'
        : saleType === 'FIXED_PRICE' || saleType === 'FIXED'
          ? 'FIXED_PRICE'
          : 'UNKNOWN',
    stockQuantity: number(r.availableQuantity ?? r.stockQuantity),
    rating: number(r.rating) ?? undefined,
    soldCount: number(r.soldCount) ?? undefined,
  };
}
export const defaultQuery: CatalogQuery = {
  q: '',
  categoryId: '',
  minPrice: '',
  maxPrice: '',
  condition: '',
  sort: 'featured',
  page: 1,
  pageSize: 12,
};
export function parseCatalogQuery(params: URLSearchParams): CatalogQuery {
  const amount = (key: string) => {
    const v = params.get(key) ?? '';
    return /^\d+(\.\d{1,2})?$/.test(v) && Number(v) >= 0 ? v : '';
  };
  const page = Number(params.get('page') || 1);
  const pageSize = Number(params.get('pageSize') || 12);
  return {
    ...defaultQuery,
    q: (params.get('q') ?? '').slice(0, 200),
    categoryId: (params.get('categoryId') ?? '').slice(0, 100),
    minPrice: amount('minPrice'),
    maxPrice: amount('maxPrice'),
    condition: ['NEW', 'LIKE_NEW', 'USED', 'REFURBISHED'].includes(params.get('condition') ?? '')
      ? params.get('condition')!
      : '',
    sort: ['featured', 'price-asc', 'price-desc', 'newest'].includes(params.get('sort') ?? '')
      ? params.get('sort')!
      : 'featured',
    page: Number.isInteger(page) && page > 0 ? Math.min(page, 10000) : 1,
    pageSize: [8, 12, 24].includes(pageSize) ? pageSize : 12,
  };
}
export function queryString(query: CatalogQuery) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query))
    if (v !== '' && !(k === 'sort' && v === 'featured')) p.set(k, String(v));
  return p.toString();
}
export function formatPrice(product: Pick<CatalogProduct, 'price' | 'currency'>): string {
  if (product.price === null) return 'Giá đang cập nhật';
  const formatted = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(
    product.price,
  );
  return product.currency
    ? new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: product.currency,
        maximumFractionDigits: product.currency === 'VND' ? 0 : 2,
      }).format(product.price)
    : `${formatted} · Chưa có đơn vị tiền`;
}
export function validateProduct(input: ProductInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.title.trim() || input.title.trim().length > 255)
    errors.title = 'Nhập tên sản phẩm từ 1 đến 255 ký tự.';
  if (!input.description.trim()) errors.description = 'Nhập mô tả để người mua đối chiếu.';
  if (!input.categoryId) errors.categoryId = 'Chọn danh mục sản phẩm.';
  if (
    !/^\d+(\.\d{1,2})?$/.test(input.price) ||
    Number(input.price) <= 0 ||
    !Number.isFinite(Number(input.price))
  )
    errors.price = 'Nhập mức giá lớn hơn 0, tối đa 2 chữ số thập phân.';
  if (!/^[A-Z]{3}$/.test(input.currency)) errors.currency = 'Chọn đơn vị tiền.';
  if (!['NEW', 'LIKE_NEW', 'USED', 'REFURBISHED'].includes(input.condition))
    errors.condition = 'Chọn tình trạng sản phẩm.';
  if (!['DRAFT', 'ACTIVE', 'INACTIVE'].includes(input.status))
    errors.status = 'Chọn trạng thái hợp lệ.';
  if (!['FIXED_PRICE', 'AUCTION'].includes(input.saleType))
    errors.saleType = 'Chọn hình thức giao dịch.';
  if (input.images.length > 5)
    errors.images = 'Mỗi sản phẩm tối đa 5 ảnh theo cấu hình mặc định SRS.';
  if (
    input.images.some((url) => {
      try {
        return !['http:', 'https:'].includes(new URL(url).protocol);
      } catch {
        return true;
      }
    })
  )
    errors.images = 'Mỗi ảnh cần một đường dẫn HTTP hoặc HTTPS hợp lệ.';
  return errors;
}
export function createCatalogApi(request: RequestApi, source: 'mock' | 'api') {
  const mockProducts = fixtures.products.map(normalizeProduct);
  return {
    source,
    async list(query: CatalogQuery, signal?: AbortSignal): Promise<CatalogPage> {
      if (source === 'mock') {
        const normalize = (s: string) =>
          s
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .toLowerCase();
        let items = mockProducts.filter(
          (p) =>
            (query.scope === 'admin' || (p.status === 'ACTIVE' && p.saleType !== 'AUCTION')) &&
            (!query.status || p.status === query.status) &&
            (!query.q || normalize(p.title + ' ' + p.sellerName).includes(normalize(query.q))) &&
            (!query.categoryId || p.categoryId === query.categoryId) &&
            (!query.condition || p.condition === query.condition) &&
            (!query.minPrice || (p.price !== null && p.price >= Number(query.minPrice))) &&
            (!query.maxPrice || (p.price !== null && p.price <= Number(query.maxPrice))),
        );
        if (query.sort === 'price-asc')
          items = items.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
        if (query.sort === 'price-desc')
          items = items.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
        if (query.sort === 'newest') items = [...items].reverse();
        return {
          items: items.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
          page: query.page,
          pageSize: query.pageSize,
          total: items.length,
          totalPages: Math.max(1, Math.ceil(items.length / query.pageSize)),
          querySupported: true,
        };
      }
      const data = unwrap<unknown>(await request('/products?' + queryString(query), { signal }));
      if (Array.isArray(data)) {
        let items = data.map(normalizeProduct);
        if (query.q) {
          const kw = query.q.toLowerCase();
          items = items.filter(
            (p) =>
              p.title.toLowerCase().includes(kw) ||
              p.description.toLowerCase().includes(kw) ||
              p.sellerName.toLowerCase().includes(kw),
          );
        }
        if (query.status) {
          items = items.filter((p) => p.status === query.status);
        }
        if (query.categoryId) {
          items = items.filter((p) => p.categoryId === query.categoryId);
        }
        if (query.condition) {
          items = items.filter((p) => p.condition === query.condition);
        }
        if (query.minPrice) {
          items = items.filter((p) => p.price !== null && p.price >= Number(query.minPrice));
        }
        if (query.maxPrice) {
          items = items.filter((p) => p.price !== null && p.price <= Number(query.maxPrice));
        }
        if (query.sort === 'price-asc') {
          items = items.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
        } else if (query.sort === 'price-desc') {
          items = items.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
        } else if (query.sort === 'newest') {
          items = [...items].reverse();
        }

        const total = items.length;
        const page = query.page || 1;
        const pageSize = query.pageSize || 10;
        const pagedItems = items.slice((page - 1) * pageSize, page * pageSize);
        return {
          items: pagedItems,
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
          querySupported: true,
        };
      }
      const page = obj(data);
      if (!Array.isArray(page.items) || !Number.isInteger(page.total) || Number(page.total) < 0)
        throw new ApiError(
          'Danh sách sản phẩm chưa có thông tin phân trang hợp lệ.',
          undefined,
          'INVALID_PAGINATION',
        );
      return {
        items: page.items.map(normalizeProduct),
        page: number(page.page) ?? query.page,
        pageSize: number(page.pageSize) ?? query.pageSize,
        total: Number(page.total),
        totalPages: Math.max(
          1,
          Math.ceil(Number(page.total) / (number(page.pageSize) || query.pageSize)),
        ),
        querySupported: true,
      };
    },
    async detail(productId: string, signal?: AbortSignal) {
      if (source === 'mock') {
        const p = mockProducts.find((p) => p.id === productId);
        if (!p) throw new ApiError('Sản phẩm không tồn tại.', 404);
        return p;
      }
      return normalizeProduct(
        unwrap(await request('/products/' + encodeURIComponent(productId), { signal })),
      );
    },
    async categories(signal?: AbortSignal): Promise<CatalogCategory[]> {
      if (source === 'mock') return fixtures.categories;
      try {
        const data = unwrap<unknown>(await request('/categories?tree=true', { signal }));
        if (!Array.isArray(data)) return fixtures.categories;
        const flat: CatalogCategory[] = [];
        const visit = (rows: unknown[], parentId: string | null = null, depth = 1) => {
          if (depth > 3) return;
          for (const v of rows) {
            const r = obj(v);
            if (!id(r.id) || !id(r.name)) continue;
            flat.push({
              id: id(r.id),
              name: id(r.name),
              parentId: id(r.parentId) || parentId,
              level: number(r.level) ?? depth,
            });
            if (Array.isArray(r.children)) visit(r.children, id(r.id), depth + 1);
          }
        };
        visit(data);
        return flat.length ? flat : fixtures.categories;
      } catch {
        return fixtures.categories;
      }
    },
    async save(input: ProductInput, productId?: string) {
      if (source === 'mock')
        throw new ApiError(
          'Chế độ xem trước không ghi dữ liệu. Chuyển sang API khi backend tạo và sửa sản phẩm được bàn giao.',
          501,
          'PREVIEW_ONLY',
        );
      const errors = validateProduct(input);
      if (Object.keys(errors).length)
        throw new ApiError(
          'Vui lòng kiểm tra thông tin sản phẩm.',
          400,
          'VALIDATION_ERROR',
          errors,
        );
      return normalizeProduct(
        unwrap(
          await request(productId ? '/products/' + encodeURIComponent(productId) : '/products', {
            method: productId ? 'PATCH' : 'POST',
            body: {
              ...input,
              title: input.title.trim(),
              description: input.description.trim(),
              price: input.price,
            },
          }),
        ),
      );
    },
  };
}
