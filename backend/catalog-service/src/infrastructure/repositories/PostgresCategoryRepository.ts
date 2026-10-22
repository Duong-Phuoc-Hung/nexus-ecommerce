import { Pool } from 'pg';
import { Category } from '../../domain/entities/Category';
import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository';

/**
 * Infrastructure Repository: PostgresCategoryRepository (SRS 3.3)
 * Truy vấn danh mục từ bảng catalog_categories trong PostgreSQL (nexus_catalog_db - Cổng 5433).
 */
export class PostgresCategoryRepository implements ICategoryRepository {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool =
      pool ||
      new Pool({
        host: process.env.DB_HOST || process.env.CATALOG_DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || process.env.CATALOG_DB_PORT) || 5433,
        user: process.env.DB_USER || process.env.CATALOG_DB_USER || 'nexus_catalog',
        password: process.env.DB_PASSWORD || process.env.CATALOG_DB_PASSWORD || 'nexus_password',
        database: process.env.DB_NAME || process.env.CATALOG_DB_NAME || 'nexus_catalog_db',
        max: 10,
        idleTimeoutMillis: 30000,
      });
  }

  public async findAll(activeOnly = true): Promise<Category[]> {
    const query = `
      SELECT id, name, slug, description, image_url, parent_id, level, is_active, display_order, created_at, updated_at
      FROM catalog_categories
      ${activeOnly ? 'WHERE is_active = TRUE' : ''}
      ORDER BY level ASC, display_order ASC, id ASC;
    `;
    const result = await this.pool.query(query);
    return result.rows.map(this.mapRowToCategory);
  }

  public async findById(id: string): Promise<Category | null> {
    const isNumeric = /^\d+$/.test(id);
    const query = `
      SELECT id, name, slug, description, image_url, parent_id, level, is_active, display_order, created_at, updated_at
      FROM catalog_categories
      WHERE ${isNumeric ? 'id = $1' : 'slug = $1'}
      LIMIT 1;
    `;
    const params: any[] = isNumeric ? [parseInt(id, 10)] : [id];
    const result = await this.pool.query(query, params);
    if (result.rows.length === 0) return null;
    return this.mapRowToCategory(result.rows[0]);
  }

  public async findBySlug(slug: string): Promise<Category | null> {
    const query = `
      SELECT id, name, slug, description, image_url, parent_id, level, is_active, display_order, created_at, updated_at
      FROM catalog_categories
      WHERE slug = $1
      LIMIT 1;
    `;
    const result = await this.pool.query(query, [slug]);
    if (result.rows.length === 0) return null;
    return this.mapRowToCategory(result.rows[0]);
  }

  public async save(category: Category): Promise<void> {
    const query = `
      INSERT INTO catalog_categories (
        name, slug, description, image_url, parent_id, level, is_active, display_order, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (slug) DO UPDATE
      SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url,
          is_active = EXCLUDED.is_active, display_order = EXCLUDED.display_order, updated_at = NOW();
    `;
    const params = [
      category.name,
      category.slug,
      category.description || null,
      category.imageUrl || null,
      category.parentId ? parseInt(category.parentId, 10) : null,
      category.level,
      category.isActive,
      category.displayOrder,
      category.createdAt,
      category.updatedAt,
    ];
    await this.pool.query(query, params);
  }

  private mapRowToCategory(row: any): Category {
    return new Category({
      id: String(row.id),
      name: row.name,
      slug: row.slug,
      description: row.description || undefined,
      imageUrl: row.image_url || undefined,
      parentId:
        row.parent_id !== null && row.parent_id !== undefined ? String(row.parent_id) : null,
      level: Number(row.level),
      isActive: Boolean(row.is_active),
      displayOrder: Number(row.display_order),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
