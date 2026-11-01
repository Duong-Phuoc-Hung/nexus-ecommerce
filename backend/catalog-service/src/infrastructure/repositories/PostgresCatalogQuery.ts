import { Pool } from 'pg';
import { Product, ProductStatus } from '../../domain/entities/Product';
import {
  ICatalogQuery,
  ListCatalogProductsQuery,
  ListCatalogProductsResult,
} from '../../application/use-cases/ListCatalogProductsUseCase';

const ORDER_BY: Record<string, string> = {
  newest: 'p.created_at DESC, p.id DESC',
  oldest: 'p.created_at ASC, p.id ASC',
  price_asc: 'p.base_price ASC, p.id ASC',
  price_desc: 'p.base_price DESC, p.id DESC',
};

const STATUSES: Record<string, ProductStatus> = {
  ACTIVE: ProductStatus.ACTIVE,
  DRAFT: ProductStatus.DRAFT,
  ARCHIVED: ProductStatus.ARCHIVED,
  OUT_OF_STOCK: ProductStatus.OUT_OF_STOCK,
};

/** Lọc, sắp xếp, phân trang và đếm tổng hoàn toàn bằng SQL; chỉ đọc đúng 1 trang. */
export class PostgresCatalogQuery implements ICatalogQuery {
  private readonly pool: Pool;

  constructor(pool?: Pool) {
    this.pool =
      pool ||
      new Pool({
        host: process.env.CATALOG_DB_HOST || process.env.DB_HOST || 'localhost',
        port: Number(process.env.CATALOG_DB_PORT || process.env.DB_PORT) || 5433,
        user: process.env.CATALOG_DB_USER || process.env.DB_USER || 'nexus_catalog',
        password: process.env.CATALOG_DB_PASSWORD || process.env.DB_PASSWORD || 'nexus_password',
        database: process.env.CATALOG_DB_NAME || process.env.DB_NAME || 'nexus_catalog_db',
        max: 5,
        idleTimeoutMillis: 30000,
      });
  }

  public async list(query: ListCatalogProductsQuery): Promise<ListCatalogProductsResult> {
    const conditions: string[] = ['p.deleted_at IS NULL'];
    const params: unknown[] = [];
    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };

    if (query.scope === 'buyer') {
      conditions.push("p.status = 'ACTIVE'", 'p.stock_quantity > 0');
    } else if (query.status) {
      conditions.push(`p.status = ${bind(query.status)}`);
    }

    if (query.categoryId) {
      conditions.push(`p.category_id::text = ${bind(query.categoryId)}`);
    }
    if (query.minPrice !== undefined) conditions.push(`p.base_price >= ${bind(query.minPrice)}`);
    if (query.maxPrice !== undefined) conditions.push(`p.base_price <= ${bind(query.maxPrice)}`);
    if (query.condition) conditions.push(`p.condition = ${bind(query.condition)}`);
    // Catalog hiện chỉ có FIXED_PRICE (xem Product.saleType)
    if (query.saleType === 'AUCTION') conditions.push('FALSE');

    const keyword = query.q?.trim().toLowerCase();
    if (keyword) {
      const like = bind(`%${keyword.replace(/[\\%_]/g, '\\$&')}%`);
      conditions.push(
        `(LOWER(p.title) LIKE ${like} OR LOWER(COALESCE(p.description, '')) LIKE ${like})`,
      );
    }

    const where = conditions.join(' AND ');
    const countResult = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM catalog_products p WHERE ${where}`,
      params,
    );
    const total: number = countResult.rows[0]?.total ?? 0;
    const meta = {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };

    const limit = bind(query.limit);
    const offset = bind((query.page - 1) * query.limit);
    const result = await this.pool.query(
      `SELECT p.id, p.seller_id, p.category_id, p.title, p.slug, p.description, p.status,
              p.condition, p.base_price, p.allow_auction, p.stock_quantity, p.seller_name,
              p.created_at, p.updated_at
       FROM catalog_products p
       WHERE ${where}
       ORDER BY ${ORDER_BY[query.sort] ?? ORDER_BY.newest}
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    if (result.rows.length === 0) return { products: [], meta };

    const ids = result.rows.map((row: any) => Number(row.id));
    const [images, attributes] = await Promise.all([
      this.loadImages(ids),
      this.loadAttributes(ids),
    ]);

    return {
      products: result.rows.map((row: any) =>
        this.toProduct(row, images[row.id] || [], attributes[row.id] || {}),
      ),
      meta,
    };
  }

  private async loadImages(ids: number[]): Promise<Record<number, string[]>> {
    const res = await this.pool.query(
      'SELECT product_id, image_url FROM catalog_product_images WHERE product_id = ANY($1) ORDER BY display_order ASC',
      [ids],
    );
    const map: Record<number, string[]> = {};
    for (const row of res.rows) (map[row.product_id] ||= []).push(row.image_url);
    return map;
  }

  private async loadAttributes(ids: number[]): Promise<Record<number, Record<string, string>>> {
    const res = await this.pool.query(
      'SELECT product_id, attribute_key, attribute_value FROM catalog_product_attributes WHERE product_id = ANY($1)',
      [ids],
    );
    const map: Record<number, Record<string, string>> = {};
    for (const row of res.rows)
      (map[row.product_id] ||= {})[row.attribute_key] = row.attribute_value;
    return map;
  }

  private toProduct(row: any, images: string[], attributes: Record<string, string>): Product {
    const stock = parseInt(row.stock_quantity, 10);
    return new Product({
      id: String(row.id),
      sellerId: String(row.seller_id),
      sellerName: row.seller_name || 'Nexus Official Store',
      categoryId: String(row.category_id),
      title: row.title,
      description: row.description,
      price: parseFloat(row.base_price),
      stockQuantity: isNaN(stock) ? 1 : stock,
      status: STATUSES[row.status] || ProductStatus.ACTIVE,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      images,
      primaryImage: images[0],
      attributes,
      condition: row.condition,
      slug: row.slug,
      allowAuction: row.allow_auction,
    });
  }
}
