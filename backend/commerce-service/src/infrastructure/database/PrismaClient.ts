import { PrismaClient } from './generated/client';

export class PrismaClientWrapper {
  private static instance: PrismaClient;

  public static getInstance(): PrismaClient {
    if (!PrismaClientWrapper.instance) {
      const host = process.env.COMMERCE_DB_HOST || process.env.DB_HOST || 'localhost';
      const port = process.env.COMMERCE_DB_PORT || process.env.DB_PORT || '5434';
      const user = process.env.COMMERCE_DB_USER || process.env.DB_USER || 'nexus_commerce';
      const password =
        process.env.COMMERCE_DB_PASSWORD || process.env.DB_PASSWORD || 'nexus_password';
      const dbName = process.env.COMMERCE_DB_NAME || process.env.DB_NAME || 'nexus_commerce_db';
      const dbUrl =
        process.env.DATABASE_URL ||
        `postgresql://${user}:${password}@${host}:${port}/${dbName}?schema=public`;

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
          '[commerce-service] Warning: Could not initialize PrismaClient:',
          (err as Error).message,
        );
      }
    }
    return PrismaClientWrapper.instance;
  }
}
