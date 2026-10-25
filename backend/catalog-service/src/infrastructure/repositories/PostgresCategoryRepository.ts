import { Pool } from 'pg';
import { CategoryRecord, ICategoryRepository } from '../../domain/repositories/ICategoryRepository';

export class PostgresCategoryRepository implements ICategoryRepository {
  private readonly pool: Pool;

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

  public async findActive(): Promise<CategoryRecord[]> {
    const result = await this.pool.query<CategoryRecord>(`
      SELECT
        id::text AS id,
        name,
        slug,
        description,
        image_url AS "imageUrl",
        parent_id::text AS "parentId",
        level,
        display_order AS "displayOrder"
      FROM catalog_categories
      WHERE is_active = TRUE
      ORDER BY level ASC, display_order ASC, id ASC;
    `);

    return result.rows;
  }
}
