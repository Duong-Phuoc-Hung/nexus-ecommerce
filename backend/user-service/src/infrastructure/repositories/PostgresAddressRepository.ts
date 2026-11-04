import { Pool } from 'pg';
import { IAddressRepository } from '../../domain/repositories/IAddressRepository';
import { Address } from '../../domain/entities/Address';

export class PostgresAddressRepository implements IAddressRepository {
  private pool: Pool;
  private tableInitialized: boolean = false;

  constructor(pool?: Pool) {
    this.pool =
      pool ||
      new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'nexus_user',
        password: process.env.DB_PASSWORD || 'nexus_password',
        database: process.env.DB_NAME || 'nexus_user_db',
        max: 10,
        idleTimeoutMillis: 30000,
      });
  }

  private async ensureTable(): Promise<void> {
    if (this.tableInitialized) return;
    try {
      const ddl = `
        CREATE TABLE IF NOT EXISTS user_addresses (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          label VARCHAR(50),
          recipient_name VARCHAR(100) NOT NULL,
          phone VARCHAR(20) NOT NULL,
          province_code VARCHAR(10) NOT NULL,
          province_name VARCHAR(100) NOT NULL,
          ward_code VARCHAR(10) NOT NULL,
          ward_name VARCHAR(100) NOT NULL,
          street VARCHAR(255) NOT NULL,
          note TEXT,
          is_default BOOLEAN NOT NULL DEFAULT FALSE,
          is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_user_address_user FOREIGN KEY (user_id) REFERENCES user_users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses (user_id);
      `;
      await this.pool.query(ddl);
      this.tableInitialized = true;
    } catch {
      // Bỏ qua nếu đã tồn tại hoặc đang chạy migration
      this.tableInitialized = true;
    }
  }

  public async findByUserId(userId: string): Promise<Address[]> {
    await this.ensureTable();
    const query = `
      SELECT id, user_id, label, recipient_name, phone, province_code, province_name,
             ward_code, ward_name, street, note, is_default, created_at, updated_at
      FROM user_addresses
      WHERE user_id = $1 AND is_deleted = false
      ORDER BY is_default DESC, created_at ASC;
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows.map((row) => this.mapRowToAddress(row));
  }

  public async findById(id: string): Promise<Address | null> {
    await this.ensureTable();
    const query = `
      SELECT id, user_id, label, recipient_name, phone, province_code, province_name,
             ward_code, ward_name, street, note, is_default, created_at, updated_at
      FROM user_addresses
      WHERE id = $1 AND is_deleted = false
      LIMIT 1;
    `;
    const result = await this.pool.query(query, [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToAddress(result.rows[0]);
  }

  public async countByUserId(userId: string): Promise<number> {
    await this.ensureTable();
    const query = `
      SELECT COUNT(*) as total
      FROM user_addresses
      WHERE user_id = $1 AND is_deleted = false;
    `;
    const result = await this.pool.query(query, [userId]);
    return Number(result.rows[0]?.total || 0);
  }

  public async save(address: Address): Promise<void> {
    await this.ensureTable();
    const query = `
      INSERT INTO user_addresses (
        id, user_id, label, recipient_name, phone, province_code, province_name,
        ward_code, ward_name, street, note, is_default, is_deleted, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, $13, $14);
    `;
    await this.pool.query(query, [
      address.id,
      address.userId,
      address.label || null,
      address.recipientName,
      address.phone,
      address.provinceCode,
      address.provinceName,
      address.wardCode,
      address.wardName,
      address.street,
      address.note || null,
      address.isDefault,
      address.createdAt,
      address.updatedAt,
    ]);
  }

  public async update(address: Address): Promise<void> {
    await this.ensureTable();
    const query = `
      UPDATE user_addresses
      SET label = $1, recipient_name = $2, phone = $3, province_code = $4,
          province_name = $5, ward_code = $6, ward_name = $7, street = $8,
          note = $9, updated_at = NOW()
      WHERE id = $10 AND is_deleted = false;
    `;
    await this.pool.query(query, [
      address.label || null,
      address.recipientName,
      address.phone,
      address.provinceCode,
      address.provinceName,
      address.wardCode,
      address.wardName,
      address.street,
      address.note || null,
      address.id,
    ]);
  }

  public async delete(id: string): Promise<void> {
    await this.ensureTable();
    const query = `
      UPDATE user_addresses
      SET is_deleted = true, is_default = false, updated_at = NOW()
      WHERE id = $1;
    `;
    await this.pool.query(query, [id]);
  }

  public async setDefault(userId: string, addressId: string): Promise<void> {
    await this.ensureTable();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE user_addresses SET is_default = false, updated_at = NOW() WHERE user_id = $1 AND is_deleted = false;`,
        [userId],
      );
      await client.query(
        `UPDATE user_addresses SET is_default = true, updated_at = NOW() WHERE id = $1 AND user_id = $2 AND is_deleted = false;`,
        [addressId, userId],
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private mapRowToAddress(row: any): Address {
    return new Address({
      id: String(row.id),
      userId: String(row.user_id),
      label: row.label || undefined,
      recipientName: row.recipient_name,
      phone: row.phone,
      provinceCode: row.province_code,
      provinceName: row.province_name,
      wardCode: row.ward_code,
      wardName: row.ward_name,
      street: row.street,
      note: row.note || undefined,
      isDefault: Boolean(row.is_default),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
