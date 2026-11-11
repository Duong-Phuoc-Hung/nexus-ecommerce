import { PrismaClient } from '@prisma/client';

export class PrismaClientWrapper {
  private static instance: PrismaClient | null = null;

  public static getInstance(): PrismaClient {
    if (!PrismaClientWrapper.instance) {
      PrismaClientWrapper.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });
    }
    return PrismaClientWrapper.instance;
  }
}
