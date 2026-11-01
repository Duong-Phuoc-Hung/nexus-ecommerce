import { CatalogProduct, ICatalogClient } from '../../application/checkout/ports';

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
}
