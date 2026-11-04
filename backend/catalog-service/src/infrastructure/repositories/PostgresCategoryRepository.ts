import { Pool } from 'pg';
import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository';
import { Category } from '../../domain/entities/Category';

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

  public async findAllActive(): Promise<Category[]> {
    const query = `
      SELECT id, name, slug, description, image_url, parent_id, level, is_active, display_order, created_at, updated_at
      FROM catalog_categories
      WHERE is_active = TRUE
      ORDER BY level ASC, display_order ASC, id ASC;
    `;
    const result = await this.pool.query(query);
    return result.rows.map((row) => this.mapRowToCategory(row));
  }

  public async findById(id: string): Promise<Category | null> {
    const isNumeric = /^\d+$/.test(id);
    const query = `
      SELECT id, name, slug, description, image_url, parent_id, level, is_active, display_order, created_at, updated_at
      FROM catalog_categories
      WHERE ${isNumeric ? 'id = $1' : 'slug = $1'}
      LIMIT 1;
    `;
    const params: (number | string)[] = isNumeric ? [parseInt(id, 10)] : [id];
    const result = await this.pool.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToCategory(result.rows[0]);
  }

  private mapRowToCategory(row: any): Category {
    return new Category({
      id: String(row.id),
      name: row.name,
      slug: row.slug,
      description: row.description,
      imageUrl: row.image_url,
      parentId:
        row.parent_id !== null && row.parent_id !== undefined ? String(row.parent_id) : null,
      level: Number(row.level),
      isActive: Boolean(row.is_active),
      displayOrder: Number(row.display_order),
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    });
  }
}
