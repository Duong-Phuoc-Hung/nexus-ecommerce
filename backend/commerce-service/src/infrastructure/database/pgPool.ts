import { Pool } from 'pg';

let poolInstance: Pool | null = null;

export function getCommerceDbPool(): Pool {
  if (!poolInstance) {
    poolInstance = new Pool({
      host: process.env.COMMERCE_DB_HOST || 'localhost',
      port: Number(process.env.COMMERCE_DB_PORT) || 5434,
      user: process.env.COMMERCE_DB_USER || 'nexus_commerce',
      password: process.env.COMMERCE_DB_PASSWORD || 'nexus_password',
      database: process.env.COMMERCE_DB_NAME || 'nexus_commerce_db',
      max: Number(process.env.COMMERCE_DB_POOL_MAX) || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    poolInstance.on('error', (err: Error) => {
      console.error('[Commerce DB Pool Error] Unexpected idle client error:', err.message);
    });
  }

  return poolInstance;
}
