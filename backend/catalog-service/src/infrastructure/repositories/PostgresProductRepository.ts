import { Pool } from 'pg';
import {
  IProductRepository,
  ProductSearchCriteria,
  ProductSearchPage,
} from '../../domain/repositories/IProductRepository';
import { Product, ProductStatus } from '../../domain/entities/Product';

/**
 * Infrastructure Repository: PostgresProductRepository (SRS 3.3)
 * Kết nối trực tiếp vào cơ sở dữ liệu PostgreSQL thật (nexus_catalog_db - Cổng 5433).
 * Đọc đầy đủ sản phẩm, bộ sưu tập ảnh và thông số kỹ thuật.
 */
export class PostgresProductRepository implements IProductRepository {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool =
      pool ||
      new Pool({
        host: process.env.CATALOG_DB_HOST || process.env.DB_HOST || 'localhost',
        port: Number(process.env.CATALOG_DB_PORT || process.env.DB_PORT) || 5433,
        user: process.env.CATALOG_DB_USER || process.env.DB_USER || 'nexus_catalog',
        password: process.env.CATALOG_DB_PASSWORD || process.env.DB_PASSWORD || 'nexus_password',
        database: process.env.CATALOG_DB_NAME || process.env.DB_NAME || 'nexus_catalog_db',
        max: 10,
        idleTimeoutMillis: 30000,
      });
  }

  public async findById(id: string): Promise<Product | null> {
    // Tìm 1 sản phẩm khi người dùng bấm vào xem chi tiết.
    const isNumeric = /^\d+$/.test(id);
    const query = `
      SELECT 
        p.id, p.seller_id, p.category_id, p.title, p.slug, p.description, 
        p.status, p.condition, p.base_price, p.allow_auction, p.stock_quantity, p.seller_name, p.created_at, p.updated_at
      FROM catalog_products p
      WHERE ${isNumeric ? '(p.id = $1 OR p.slug = $2)' : 'p.slug = $1'}
        AND p.deleted_at IS NULL
      LIMIT 1;
    `;

    const params = isNumeric ? [parseInt(id, 10), id] : [id];
    const result = await this.pool.query(query, params);
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const [images, attributes] = await Promise.all([
      this.getImagesByProductId(row.id), // lấy danh sách ảnh
      this.getAttributesByProductId(row.id), // lấy dạng thuộc tính
    ]);

    return this.mapRowToProduct(row, images, attributes);
  }

  public async findAll(limit = 50, offset = 0): Promise<Product[]> {
    // Lấy toàn bộ danh sách sản phẩm để hiển thị lên trang chủ
    const query = `
      SELECT 
        p.id, p.seller_id, p.category_id, p.title, p.slug, p.description, 
        p.status, p.condition, p.base_price, p.allow_auction, p.stock_quantity, p.seller_name, p.created_at, p.updated_at
      FROM catalog_products p
      WHERE p.deleted_at IS NULL
      ORDER BY p.id ASC
      LIMIT $1 OFFSET $2;
    `;
    const result = await this.pool.query(query, [limit, offset]);
    if (result.rows.length === 0) {
      return [];
    }

    const productIds = result.rows.map((r: any) => Number(r.id));
    const [imagesMap, attributesMap] = await Promise.all([
      this.getImagesForProductIds(productIds),
      this.getAttributesForProductIds(productIds),
    ]);

    return result.rows.map((row: any) =>
      this.mapRowToProduct(row, imagesMap[row.id] || [], attributesMap[row.id] || {}),
    );
  }

  public async findByCategory(categoryId: string): Promise<Product[]> {
    const isNumeric = /^\d+$/.test(categoryId);
    const query = `
      SELECT 
        p.id, p.seller_id, p.category_id, p.title, p.slug, p.description, 
        p.status, p.condition, p.base_price, p.allow_auction, p.stock_quantity, p.seller_name, p.created_at, p.updated_at
      FROM catalog_products p
      WHERE ${isNumeric ? 'p.category_id = $1' : 'p.category_id = (SELECT id FROM catalog_categories WHERE slug = $1 LIMIT 1)'}
        AND p.deleted_at IS NULL
      ORDER BY p.id ASC;
    `;
    const params: any[] = isNumeric ? [parseInt(categoryId, 10)] : [categoryId];
    const result = await this.pool.query(query, params);
    if (result.rows.length === 0) {
      return [];
    }

    const productIds = result.rows.map((r: any) => Number(r.id));
    const [imagesMap, attributesMap] = await Promise.all([
      this.getImagesForProductIds(productIds),
      this.getAttributesForProductIds(productIds),
    ]);

    return result.rows.map((row: any) =>
      this.mapRowToProduct(row, imagesMap[row.id] || [], attributesMap[row.id] || {}),
    );
  }

  public async findBySellerId(sellerId: string, status?: string): Promise<Product[]> {
    const conditions: string[] = ['p.seller_id = $1'];
    const params: any[] = [sellerId];

    if (status) {
      if (status.toUpperCase() === 'DELETED') {
        conditions.push("(p.deleted_at IS NOT NULL OR p.status = 'DELETED')");
      } else {
        params.push(status.toUpperCase());
        conditions.push(`p.deleted_at IS NULL AND p.status = ${params.length}`);
      }
    }

    const whereClause = conditions.join(' AND ');
    const query = `
      SELECT 
        p.id, p.seller_id, p.category_id, p.title, p.slug, p.description, 
        CASE WHEN p.deleted_at IS NOT NULL THEN 'DELETED' ELSE p.status END AS status,
        p.condition, p.base_price, p.allow_auction, p.stock_quantity, p.seller_name, p.created_at, p.updated_at
      FROM catalog_products p
      WHERE ${whereClause}
      ORDER BY p.id DESC;
    `;
    const result = await this.pool.query(query, params);
    if (result.rows.length === 0) {
      return [];
    }

    const productIds = result.rows.map((r: any) => Number(r.id));
    const [imagesMap, attributesMap] = await Promise.all([
      this.getImagesForProductIds(productIds),
      this.getAttributesForProductIds(productIds),
    ]);

    return result.rows.map((row: any) =>
      this.mapRowToProduct(row, imagesMap[row.id] || [], attributesMap[row.id] || {}),
    );
  }

  public async search(criteria: ProductSearchCriteria): Promise<ProductSearchPage> {
    const conditions: string[] = ['p.deleted_at IS NULL', "p.status = 'ACTIVE'"];
    const params: any[] = [];

    params.push(`%${criteria.q.trim().toLowerCase()}%`);
    conditions.push(
      `(LOWER(p.title) LIKE $${params.length} OR LOWER(COALESCE(p.description, '')) LIKE $${params.length})`,
    );

    if (criteria.categoryId) {
      const isNumeric = /^\d+$/.test(criteria.categoryId);
      if (isNumeric) {
        params.push(parseInt(criteria.categoryId, 10));
        conditions.push(`p.category_id = $${params.length}`);
      } else {
        params.push(criteria.categoryId);
        conditions.push(
          `EXISTS (SELECT 1 FROM catalog_categories c WHERE c.id = p.category_id AND c.slug = $${params.length})`,
        );
      }
    }

    if (criteria.minPrice !== undefined) {
      params.push(criteria.minPrice);
      conditions.push(`p.base_price >= $${params.length}`);
    }

    if (criteria.maxPrice !== undefined) {
      params.push(criteria.maxPrice);
      conditions.push(`p.base_price <= $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query(
      `SELECT COUNT(*)::int as total FROM catalog_products p WHERE ${whereClause}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    params.push(criteria.limit);
    const limitParam = `$${params.length}`;
    params.push(criteria.offset);
    const offsetParam = `$${params.length}`;

    const query = `
      SELECT 
        p.id, p.seller_id, p.category_id, p.title, p.slug, p.description, 
        p.status, p.condition, p.base_price, p.allow_auction, p.stock_quantity, p.seller_name, p.created_at, p.updated_at
      FROM catalog_products p
      WHERE ${whereClause}
      ORDER BY p.id ASC
      LIMIT ${limitParam} OFFSET ${offsetParam};
    `;

    const result = await this.pool.query(query, params);
    if (result.rows.length === 0) {
      return { products: [], total };
    }

    const productIds = result.rows.map((r: any) => Number(r.id));
    const [imagesMap, attributesMap] = await Promise.all([
      this.getImagesForProductIds(productIds),
      this.getAttributesForProductIds(productIds),
    ]);

    return {
      products: result.rows.map((row: any) =>
        this.mapRowToProduct(row, imagesMap[row.id] || [], attributesMap[row.id] || {}),
      ),
      total,
    };
  }

  public async save(product: Product): Promise<string> {
    // Lưu sản phẩm mới
    const query = `
      INSERT INTO catalog_products (
        seller_id, category_id, title, slug, description, status, condition, base_price, allow_auction, stock_quantity, seller_name, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id;
    `;
    const params = [
      product.sellerId,
      product.categoryId,
      product.title,
      product.slug || this.slugify(product.title),
      product.description,
      product.status,
      product.condition || 'NEW',
      product.price,
      product.allowAuction ?? false,
      product.stockQuantity ?? 1,
      product.sellerName || 'Nexus Official Store',
      product.createdAt,
      product.updatedAt,
    ];
    const result = await this.pool.query(query, params);
    const newProductId = result.rows[0]?.id;

    if (newProductId) {
      // 1. Tự động lưu mảng ảnh sang bảng catalog_product_images
      if (product.images && product.images.length > 0) {
        for (let i = 0; i < product.images.length; i++) {
          await this.pool.query(
            `INSERT INTO catalog_product_images (product_id, image_url, display_order, is_primary)
             VALUES ($1, $2, $3, $4);\n`,
            [newProductId, product.images[i], i + 1, i === 0],
          );
        }
      }

      // 2. Tự động lưu thuộc tính sang bảng catalog_product_attributes
      if (product.attributes && typeof product.attributes === 'object') {
        for (const [key, val] of Object.entries(product.attributes)) {
          if (val) {
            await this.pool.query(
              `INSERT INTO catalog_product_attributes (product_id, attribute_key, attribute_value)
               VALUES ($1, $2, $3);\n`,
              [newProductId, key, String(val)],
            );
          }
        }
      }
    }

    return String(newProductId || '0');
  }

  public async update(product: Product): Promise<void> {
    const productId = parseInt(product.id, 10);

    // 1. Cập nhật thông tin chính trong bảng catalog_products
    const query = `
      UPDATE catalog_products
      SET 
        category_id = $1,
        title = $2, 
        description = $3, 
        base_price = $4, 
        status = $5, 
        stock_quantity = $6, 
        condition = $7,
        allow_auction = $8,
        seller_name = $9, 
        updated_at = NOW()
      WHERE id = $10;
    `;
    await this.pool.query(query, [
      parseInt(product.categoryId, 10),
      product.title,
      product.description,
      product.price,
      product.status,
      product.stockQuantity,
      product.condition || 'NEW',
      product.allowAuction ?? false,
      product.sellerName || 'Nexus Official Store',
      productId,
    ]);

    // 2. Đồng bộ lại danh sách ảnh (nếu có truyền ảnh mới)
    if (product.images && product.images.length > 0) {
      await this.pool.query('DELETE FROM catalog_product_images WHERE product_id = $1;', [
        productId,
      ]);
      for (let i = 0; i < product.images.length; i++) {
        await this.pool.query(
          `INSERT INTO catalog_product_images (product_id, image_url, display_order, is_primary)
           VALUES ($1, $2, $3, $4);`,
          [productId, product.images[i], i + 1, i === 0],
        );
      }
    }

    // 3. Đồng bộ lại thuộc tính chi tiết attributes (nếu có truyền)
    if (product.attributes && Object.keys(product.attributes).length > 0) {
      await this.pool.query('DELETE FROM catalog_product_attributes WHERE product_id = $1;', [
        productId,
      ]);
      for (const [key, val] of Object.entries(product.attributes)) {
        if (val) {
          await this.pool.query(
            `INSERT INTO catalog_product_attributes (product_id, attribute_key, attribute_value)
             VALUES ($1, $2, $3);`,
            [productId, key, String(val)],
          );
        }
      }
    }
  }

  public async delete(id: string): Promise<void> {
    // Xoá mềm sản phẩm
    await this.pool.query(
      "UPDATE catalog_products SET deleted_at = NOW(), status = 'DELETED', updated_at = NOW() WHERE id = $1",
      [parseInt(id, 10)],
    );
  }

  public async recover(id: string, sellerId?: string): Promise<void> {
    const pid = parseInt(id, 10);
    let query =
      "UPDATE catalog_products SET deleted_at = NULL, status = 'ACTIVE', updated_at = NOW() WHERE id = $1";
    const params: any[] = [pid];
    if (sellerId && sellerId !== '1') {
      params.push(sellerId);
      query += " AND (seller_id = $2 OR seller_id = '1')";
    }
    await this.pool.query(query, params);
  }

  private async getImagesByProductId(productId: number): Promise<string[]> {
    const res = await this.pool.query(
      `SELECT image_url FROM catalog_product_images WHERE product_id = $1 ORDER BY display_order ASC;`,
      [productId],
    );
    return res.rows.map((r: any) => r.image_url);
  }

  private async getImagesForProductIds(productIds: number[]): Promise<Record<number, string[]>> {
    const res = await this.pool.query(
      `SELECT product_id, image_url FROM catalog_product_images WHERE product_id = ANY($1) ORDER BY display_order ASC;`,
      [productIds],
    );
    const map: Record<number, string[]> = {};
    for (const r of res.rows) {
      if (!map[r.product_id]) {
        map[r.product_id] = [];
      }
      map[r.product_id].push(r.image_url);
    }
    return map;
  }

  private async getAttributesByProductId(productId: number): Promise<Record<string, string>> {
    const res = await this.pool.query(
      `SELECT attribute_key, attribute_value FROM catalog_product_attributes WHERE product_id = $1;`,
      [productId],
    );
    const attrs: Record<string, string> = {};
    for (const r of res.rows) {
      attrs[r.attribute_key] = r.attribute_value;
    }
    return attrs;
  }

  private async getAttributesForProductIds(
    productIds: number[],
  ): Promise<Record<number, Record<string, string>>> {
    const res = await this.pool.query(
      `SELECT product_id, attribute_key, attribute_value FROM catalog_product_attributes WHERE product_id = ANY($1);`,
      [productIds],
    );
    const map: Record<number, Record<string, string>> = {};
    for (const r of res.rows) {
      if (!map[r.product_id]) {
        map[r.product_id] = {};
      }
      map[r.product_id][r.attribute_key] = r.attribute_value;
    }
    return map;
  }

  private mapRowToProduct(
    row: any,
    images: string[] = [],
    attributes: Record<string, string> = {},
  ): Product {
    const statusMap: Record<string, ProductStatus> = {
      ACTIVE: ProductStatus.ACTIVE,
      DRAFT: ProductStatus.DRAFT,
      ARCHIVED: ProductStatus.ARCHIVED,
      OUT_OF_STOCK: ProductStatus.OUT_OF_STOCK,
      DELETED: ProductStatus.DELETED,
    };

    const stock =
      row.stock_quantity !== undefined && row.stock_quantity !== null
        ? parseInt(row.stock_quantity, 10)
        : 1;

    return new Product({
      id: String(row.id),
      sellerId: String(row.seller_id),
      sellerName: row.seller_name || 'Nexus Official Store',
      categoryId: String(row.category_id),
      title: row.title,
      description: row.description,
      price: parseFloat(row.base_price),
      stockQuantity: isNaN(stock) ? 1 : stock,
      status: statusMap[row.status] || ProductStatus.ACTIVE,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      images: images,
      primaryImage: images.length > 0 ? images[0] : undefined,
      attributes: attributes,
      condition: row.condition,
      slug: row.slug,
      allowAuction: row.allow_auction,
    });
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
}
