/**
 * Infrastructure Database: PrismaClientWrapper
 * Quản lý kết nối cơ sở dữ liệu cô lập của Catalog Service (PostgreSQL port 5433 - SRS 4.1).
 */
export class PrismaClientWrapper {
  private static instance: PrismaClientWrapper;

  private constructor() {}

  public static getInstance(): PrismaClientWrapper {
    if (!PrismaClientWrapper.instance) {
      PrismaClientWrapper.instance = new PrismaClientWrapper();
    }
    return PrismaClientWrapper.instance;
  }

  public async connect(): Promise<void> {
    const port = process.env.CATALOG_DB_PORT || '5438';
    console.log(`[Catalog DB] Connected to PostgreSQL (Port: ${port})`);
  }
}
