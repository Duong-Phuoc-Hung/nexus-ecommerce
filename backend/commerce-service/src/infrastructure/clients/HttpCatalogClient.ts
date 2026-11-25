import { CatalogProduct, ICatalogClient } from '../../application/checkout/ports';
import { buildServiceAuthHeader } from '../security/internal-service-auth';

interface CatalogProductBody {
  success?: boolean;
  data?: {
    id?: string | number;
    sellerId?: string | number;
    title?: string;
    price?: number | string;
    stockQuantity?: number | string;
    status?: string;
    primaryImage?: string | null;
    images?: string[];
    imageUrl?: string | null;
  };
}

/** Chỉ gọi API đọc công khai GET /products/:id của Catalog Service. */
export class HttpCatalogClient implements ICatalogClient {
  constructor(
    private readonly baseUrl = process.env.CATALOG_SERVICE_URL ||
      `http://localhost:${process.env.CATALOG_SERVICE_PORT || 4002}`,
  ) {}

  public async findProduct(productId: string): Promise<CatalogProduct | null> {
    const response = await fetch(`${this.baseUrl}/api/v1/products/${productId}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Catalog Service responded ${response.status}`);

    const body = (await response.json()) as CatalogProductBody;
    const data = body.data;
    if (!data || data.id === undefined) return null;

    const imageUrl =
      (typeof data.imageUrl === 'string' && data.imageUrl) ||
      (typeof data.primaryImage === 'string' && data.primaryImage) ||
      (Array.isArray(data.images) && data.images.length > 0 && typeof data.images[0] === 'string'
        ? data.images[0]
        : null);

    return {
      id: String(data.id),
      sellerId: String(data.sellerId ?? ''),
      title: String(data.title ?? ''),
      price: Number(data.price),
      stockQuantity: Number(data.stockQuantity ?? 0),
      status: String(data.status ?? ''),
      imageUrl: imageUrl || null,
    };
  }

  public async deductStock(productId: string, quantity: number, orderId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/products/${productId}/deduct-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildServiceAuthHeader({
            issuer: 'commerce-service',
            audience: 'catalog-service',
            scope: 'catalog:stock:deduct',
            resource: productId,
          }),
        },
        body: JSON.stringify({
          orderId,
          quantity,
          reason: 'ORDER_PAYMENT_COMPLETED',
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(
            `[HttpCatalogClient] Catalog deduct-stock endpoint chưa được Catalog Service mở (404). Tồn kho tạm thời được bảo lưu bởi Commerce stock reservation.`,
          );
        } else {
          console.warn(
            `[HttpCatalogClient] Trừ tồn kho sản phẩm ${productId} trả về mã lỗi HTTP ${response.status}`,
          );
        }
        return false;
      }
      return true;
    } catch (err: any) {
      console.warn(
        `[HttpCatalogClient] Gọi API trừ tồn kho sản phẩm ${productId} thất bại:`,
        err?.message || err,
      );
      return false;
    }
  }

  public async restoreStock(
    productId: string,
    quantity: number,
    orderId: string,
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/products/${productId}/restore-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildServiceAuthHeader({
            issuer: 'commerce-service',
            audience: 'catalog-service',
            scope: 'catalog:stock:restore',
            resource: productId,
          }),
        },
        body: JSON.stringify({
          orderId,
          quantity,
          reason: 'ORDER_CANCELLED_STOCK_RESTORE',
        }),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (err: any) {
      console.warn(
        `[HttpCatalogClient] Gọi API hoàn tồn kho sản phẩm ${productId} thất bại:`,
        err?.message || err,
      );
      return false;
    }
  }
}
