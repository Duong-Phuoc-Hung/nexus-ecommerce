import { PrismaClient } from './generated/client';

export class PrismaClientWrapper {
  private static instance: PrismaClient;

  public static getInstance(): PrismaClient {
    if (!PrismaClientWrapper.instance) {
      const host = process.env.AUCTION_DB_HOST || process.env.DB_HOST || 'localhost';
      const port = process.env.AUCTION_DB_PORT || process.env.DB_PORT || '5435';
      const user = process.env.AUCTION_DB_USER || process.env.DB_USER || 'nexus_auction';
      const password =
        process.env.AUCTION_DB_PASSWORD || process.env.DB_PASSWORD || 'nexus_password';
      const dbName = process.env.AUCTION_DB_NAME || process.env.DB_NAME || 'nexus_auction_db';
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
          '[auction-service] Warning: Could not initialize PrismaClient:',
          (err as Error).message,
        );
      }
    }
    return PrismaClientWrapper.instance;
  }
}
