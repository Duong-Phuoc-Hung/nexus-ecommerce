import { requestApi } from '@/lib/axios/api-client';
import { unwrap } from '@/lib/axios/http';

export type BackendCategory = {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  level?: number;
  children?: BackendCategory[];
};

export type FlatCategory = {
  id: string;
  name: string;
  rawName: string;
  level: number;
};

export type BackendProduct = {
  id: string;
  sellerId: string;
  sellerName?: string;
  saleType: string;
  categoryId: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  stockQuantity: number;
  status: string;
  images?: string[];
  primaryImage?: string;
  condition?: string;
  slug?: string;
  attributes?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
};

export const sellerProductsApi = {
  /**
   * API 1: GET /api/v1/categories?tree=true
   * Lấy danh mục sản phẩm cấu trúc cây phân cấp
   */
  async getCategories(signal?: AbortSignal): Promise<FlatCategory[]> {
    const raw = await requestApi<{ success: boolean; data: BackendCategory[] }>(
      '/categories?tree=true',
      { signal },
    );
    const list = unwrap<BackendCategory[]>(raw);
    const flat: FlatCategory[] = [];

    function traverse(nodes: BackendCategory[], depth = 0) {
      if (!Array.isArray(nodes)) return;
      for (const node of nodes) {
        flat.push({
          id: node.id,
          name: `${'— '.repeat(depth)}${node.name}`,
          rawName: node.name,
          level: depth,
        });
        if (node.children && node.children.length > 0) {
          traverse(node.children, depth + 1);
        }
      }
    }

    traverse(Array.isArray(list) ? list : []);
    return flat;
  },

  /**
   * API 2: GET /api/v1/products
   * Lấy danh sách sản phẩm hiển thị trên sàn
   */
  async list(signal?: AbortSignal): Promise<BackendProduct[]> {
    const raw = await requestApi<{ success: boolean; data: BackendProduct[] }>('/products', {
      signal,
    });
    const list = unwrap<BackendProduct[]>(raw);
    return Array.isArray(list) ? list : [];
  },

  /**
   * API 3: GET /api/v1/products/search?q=...
   * Tìm kiếm sản phẩm theo từ khóa
   */
  async search(query: string, signal?: AbortSignal): Promise<BackendProduct[]> {
    const raw = await requestApi<{ success: boolean; data: BackendProduct[] }>(
      `/products/search?q=${encodeURIComponent(query)}`,
      { signal },
    );
    const list = unwrap<BackendProduct[]>(raw);
    return Array.isArray(list) ? list : [];
  },

  /**
   * API 4: GET /api/v1/products/:id
   * Xem chi tiết sản phẩm theo ID hoặc Slug
   */
  async getById(id: string, signal?: AbortSignal): Promise<BackendProduct> {
    const raw = await requestApi<{ success: boolean; data: BackendProduct }>(
      `/products/${encodeURIComponent(id)}`,
      { signal },
    );
    return unwrap<BackendProduct>(raw);
  },
};
