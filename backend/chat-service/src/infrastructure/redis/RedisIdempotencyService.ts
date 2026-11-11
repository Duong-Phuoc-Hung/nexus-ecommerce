/**
 * Infrastructure Service: RedisIdempotencyService
 * Khóa chống trùng lặp dữ liệu (Idempotency Key) qua Redis hoặc In-Memory Fallback
 */
export class RedisIdempotencyService {
  private readonly inMemoryStore = new Map<string, { value: any; expiresAt: number }>();

  public async get<T>(key: string): Promise<T | null> {
    const formattedKey = `nexus:idemp:${key}`;

    // 1. Kiểm tra trong bộ nhớ cục bộ
    const item = this.inMemoryStore.get(formattedKey);
    if (item) {
      if (Date.now() > item.expiresAt) {
        this.inMemoryStore.delete(formattedKey);
        return null;
      }
      return item.value as T;
    }

    return null;
  }

  public async set(key: string, value: any, ttlSeconds: number = 86400): Promise<void> {
    const formattedKey = `nexus:idemp:${key}`;
    this.inMemoryStore.set(formattedKey, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  public clear(): void {
    this.inMemoryStore.clear();
  }
}
