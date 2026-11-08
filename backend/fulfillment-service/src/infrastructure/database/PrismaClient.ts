import { PrismaClient } from './generated/client';

export class PrismaClientWrapper {
  private static instance: PrismaClient;

  private constructor() {}

  public static getInstance(): PrismaClient {
    if (!PrismaClientWrapper.instance) {
      const host = process.env.FULFILLMENT_DB_HOST || process.env.DB_HOST || 'localhost';
      const port = process.env.FULFILLMENT_DB_PORT || process.env.DB_PORT || '5436';
      const user = process.env.FULFILLMENT_DB_USER || process.env.DB_USER || 'nexus_fulfillment';
      const password =
        process.env.FULFILLMENT_DB_PASSWORD || process.env.DB_PASSWORD || 'nexus_password';
      const dbName =
        process.env.FULFILLMENT_DB_NAME || process.env.DB_NAME || 'nexus_fulfillment_db';
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
          '[fulfillment-service] Warning: Could not initialize PrismaClient:',
          (err as Error).message,
        );
      }
    }
    return PrismaClientWrapper.instance;
  }
}
