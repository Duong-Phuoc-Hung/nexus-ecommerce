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
  saleType?: string;
  categoryId: string;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  stockQuantity: number;
  status: string;
  images?: string[];
  primaryImage?: string;
  condition?: string;
  slug?: string;
  allowAuction?: boolean;
  attributes?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateProductInput = {
  title: string;
  description: string;
  categoryId: string;
  price: number;
  stockQuantity?: number;
  condition?: string;
  images?: string[];
  attributes?: Record<string, any>;
  allowAuction?: boolean;
};

export type UpdateProductInput = {
  title?: string;
  description?: string;
  categoryId?: string;
  price?: number;
  stockQuantity?: number;
  condition?: string;
  status?: string;
  images?: string[];
  attributes?: Record<string, any>;
  allowAuction?: boolean;
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
   * API 2 (MỚI): GET /api/v1/products/mine
   * Lấy danh sách sản phẩm trong kho của chính Seller
   */
  async getMine(status?: string, signal?: AbortSignal): Promise<BackendProduct[]> {
    const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    const raw = await requestApi<{ success: boolean; total?: number; data: BackendProduct[] }>(
      `/products/mine${query}`,
      { signal },
    );
    const list = unwrap<BackendProduct[]>(raw);
    return Array.isArray(list) ? list : [];
  },

  /**
   * API 3: GET /api/v1/products
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
   * API 4: GET /api/v1/products/search?q=...
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
   * API 5: GET /api/v1/products/:id
   * Xem chi tiết sản phẩm theo ID hoặc Slug
   */
  async getById(id: string, signal?: AbortSignal): Promise<BackendProduct> {
    const raw = await requestApi<{ success: boolean; data: BackendProduct }>(
      `/products/${encodeURIComponent(id)}`,
      { signal },
    );
    return unwrap<BackendProduct>(raw);
  },

  /**
   * API 6 (MỚI): POST /api/v1/products
   * Đăng bán sản phẩm mới cho Seller
   */
  async create(
    payload: CreateProductInput,
    signal?: AbortSignal,
  ): Promise<{ id: string; slug?: string; title: string }> {
    const raw = await requestApi<{
      success: boolean;
      message: string;
      data: { id: string; slug: string; title: string };
    }>('/products', {
      method: 'POST',
      body: payload,
      signal,
    });
    return unwrap<{ id: string; slug: string; title: string }>(raw);
  },

  /**
   * API 7 (MỚI): PUT /api/v1/products/:id
   * Cập nhật thông tin sản phẩm của Seller
   */
  async update(
    id: string,
    payload: UpdateProductInput,
    signal?: AbortSignal,
  ): Promise<Partial<BackendProduct>> {
    const raw = await requestApi<{
      success: boolean;
      message: string;
      data: Partial<BackendProduct>;
    }>(`/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: payload,
      signal,
    });
    return unwrap<Partial<BackendProduct>>(raw);
  },

  /**
   * API 8 (MỚI): DELETE /api/v1/products/:id
   * Xóa sản phẩm khỏi kho của Seller
   */
  /**
   * API 9 (MỚI): POST /api/v1/products/:id/recover
   * Khôi phục sản phẩm đã xóa về trạng thái Đang bán
   */
  async recover(id: string, signal?: AbortSignal): Promise<{ success: boolean; message: string }> {
    const raw = await requestApi<{ success: boolean; message: string }>(
      `/products/${encodeURIComponent(id)}/recover`,
      {
        method: 'POST',
        signal,
      },
    );
    return raw;
  },

  async delete(id: string, signal?: AbortSignal): Promise<{ success: boolean; message: string }> {
    const raw = await requestApi<{ success: boolean; message: string }>(
      `/products/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        signal,
      },
    );
    return raw;
  },
};
