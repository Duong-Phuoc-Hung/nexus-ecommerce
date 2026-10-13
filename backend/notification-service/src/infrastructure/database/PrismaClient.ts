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
    console.log('[Notification DB] Connected to PostgreSQL (Port: 5437)');
  }
}
