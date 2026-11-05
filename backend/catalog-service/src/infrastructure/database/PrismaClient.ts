import { PrismaClient } from '@prisma/client';

export class PrismaClientWrapper {
  private static instance: PrismaClient;

  public static getInstance(): PrismaClient {
    if (!PrismaClientWrapper.instance) {
      const host = process.env.CATALOG_DB_HOST || process.env.DB_HOST || 'localhost';
      const port = process.env.CATALOG_DB_PORT || process.env.DB_PORT || '5433';
      const user = process.env.CATALOG_DB_USER || process.env.DB_USER || 'nexus_catalog';
      const password =
        process.env.CATALOG_DB_PASSWORD || process.env.DB_PASSWORD || 'nexus_password';
      const dbName = process.env.CATALOG_DB_NAME || process.env.DB_NAME || 'nexus_catalog_db';
      const dbUrl =
        process.env.DATABASE_URL ||
        `postgresql://${user}:${password}@${host}:${port}/${dbName}?schema=public`;

      PrismaClientWrapper.instance = new PrismaClient({
        datasources: {
          db: {
            url: dbUrl,
          },
        },
      });
    }
    return PrismaClientWrapper.instance;
  }
}
