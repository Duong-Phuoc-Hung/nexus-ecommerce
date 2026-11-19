import { PrismaClient } from './generated/client';

export { PrismaClient } from './generated/client';

export class PrismaClientWrapper {
  private static instance: PrismaClient;

  public static getInstance(): PrismaClient {
    if (!PrismaClientWrapper.instance) {
      const rawHost = process.env.CATALOG_DB_HOST || process.env.DB_HOST || '127.0.0.1';
      const host = rawHost === 'localhost' ? '127.0.0.1' : rawHost;
      const port = process.env.CATALOG_DB_PORT || process.env.DB_PORT || '5433';
      const user = process.env.CATALOG_DB_USER || process.env.DB_USER || 'nexus_catalog';
      const password =
        process.env.CATALOG_DB_PASSWORD || process.env.DB_PASSWORD || 'nexus_password';
      const dbName = process.env.CATALOG_DB_NAME || process.env.DB_NAME || 'nexus_catalog_db';
      const rawDbUrl =
        process.env.DATABASE_URL ||
        process.env.CATALOG_DB_URL ||
        `postgresql://${user}:${password}@${host}:${port}/${dbName}?schema=public`;
      const dbUrl = rawDbUrl.replace('@localhost:', '@127.0.0.1:');

      try {
        PrismaClientWrapper.instance = new PrismaClient({
          datasources: {
            db: {
              url: dbUrl,
            },
          },
        });
      } catch (err) {
        console.warn(
          '[catalog-service] Warning: Could not initialize PrismaClient:',
          (err as Error).message,
        );
      }
    }
    return PrismaClientWrapper.instance;
  }
}
