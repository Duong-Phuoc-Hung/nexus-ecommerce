import { Pool } from 'pg';

let poolInstance: Pool | null = null;

export function getFulfillmentDbPool(): Pool {
  if (!poolInstance) {
    poolInstance = new Pool({
      host: process.env.FULFILLMENT_DB_HOST || 'localhost',
      port: Number(process.env.FULFILLMENT_DB_PORT) || 5436,
      user: process.env.FULFILLMENT_DB_USER || 'nexus_fulfillment',
      password: process.env.FULFILLMENT_DB_PASSWORD || 'nexus_password',
      database: process.env.FULFILLMENT_DB_NAME || 'nexus_fulfillment_db',
      max: Number(process.env.FULFILLMENT_DB_POOL_MAX) || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    poolInstance.on('error', (err: Error) => {
      console.error('[Fulfillment DB Pool Error] Unexpected idle client error:', err.message);
    });
  }

  return poolInstance;
}
