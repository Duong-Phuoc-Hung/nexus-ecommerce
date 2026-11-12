import Redis from 'ioredis';

export interface OtpRedisClient {
  status?: string;
  connect(): Promise<unknown>;
  disconnect(): void;
  on(event: string, listener: (...args: any[]) => void): unknown;
  ttl(key: string): Promise<number>;
  set(key: string, value: string, expiryMode: 'EX', time: number): Promise<unknown>;
  get(key: string): Promise<string | null>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  del(key: string): Promise<number>;
}

export interface RedisOtpStoreOptions {
  createClient?: () => OtpRedisClient;
  enableRedisInTest?: boolean;
}

interface MemoryOtpEntry {
  otp: string;
  expiresAt: number;
  /** Đánh dấu OTP này chưa được ghi lên Redis (rơi vào RAM khi Redis mất kết nối/lỗi ghi). */
  fallbackOnly: boolean;
}

export class RedisOtpStore {
  private redisClient?: OtpRedisClient;
  private memoryFallback: Map<string, MemoryOtpEntry> = new Map();
  private cooldownMemory: Map<string, number> = new Map();
  private rateLimitMemory: Map<string, { count: number; resetAt: number }> = new Map();
  private attemptsMemory: Map<string, number> = new Map();
  private isRedisConnected: boolean = false;
  private isInitialized: boolean = false;
  private connectPromise: Promise<void> | null = null;

  constructor(private readonly options?: RedisOtpStoreOptions) {}

  private createDefaultClient(): OtpRedisClient {
    const connectTimeout = Math.min(Number(process.env.REDIS_TIMEOUT) || 2000, 3000);
    const retryStrategy = (times: number): number | null =>
      times <= 2 ? Math.min(times * 250, 1000) : null;

    const redisUrl = process.env.REDIS_URL?.trim();
    if (redisUrl && !process.env.REDIS_HOST && !process.env.REDIS_PORT) {
      return new Redis(redisUrl, {
        connectTimeout,
        maxRetriesPerRequest: 1,
        retryStrategy,
        lazyConnect: true,
      });
    }

    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = Number(process.env.REDIS_PORT) || 6379;
    const password = process.env.REDIS_PASSWORD || undefined;
    return new Redis({
      host,
      port,
      ...(password ? { password } : {}),
      connectTimeout,
      maxRetriesPerRequest: 1,
      retryStrategy,
      lazyConnect: true,
    });
  }

  private async ensureReady(): Promise<void> {
    if (this.connectPromise) {
      await this.connectPromise;
      return;
    }
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Trong môi trường test mặc định dùng RAM để tránh treo socket nếu không inject mock Redis
    if (!this.options?.enableRedisInTest && process.env.NODE_ENV === 'test') {
      this.isRedisConnected = false;
      return;
    }

    try {
      const client = this.options?.createClient
        ? this.options.createClient()
        : this.createDefaultClient();
      this.redisClient = client;

      client.on('ready', () => {
        this.isRedisConnected = true;
      });
      client.on('error', () => {
        this.isRedisConnected = false;
      });
      client.on('close', () => {
        this.isRedisConnected = false;
      });
      client.on('end', () => {
        this.isRedisConnected = false;
      });

      const pending = Promise.resolve(client.connect())
        .then(() => {
          if (
            client.status === undefined ||
            client.status === 'ready' ||
            client.status === 'connect'
          ) {
            this.isRedisConnected = true;
          }
          console.log('[RedisOtpStore] ✅ Kết nối thành công tới Redis cho lưu trữ OTP.');
        })
        .catch((err: unknown) => {
          this.isRedisConnected = false;
          const message = err instanceof Error ? err.message : String(err);
          console.warn(
            '[RedisOtpStore] ⚠️ Không kết nối được Redis, sử dụng bộ nhớ RAM fallback:',
            message,
          );
        })
        .finally(() => {
          if (this.connectPromise === pending) {
            this.connectPromise = null;
          }
        });

      this.connectPromise = pending;
      await pending;
    } catch {
      this.isRedisConnected = false;
    }
  }

  /** Khởi tạo kết nối Redis sớm khi service khởi động (không chặn server listen). */
  public async warmUp(): Promise<boolean> {
    await this.ensureReady();
    return this.isRedisConnected;
  }

  private getKey(email: string): string {
    return `otp:register:${email.trim().toLowerCase()}`;
  }

  private getCooldownKey(email: string): string {
    return `otp:cooldown:${email.trim().toLowerCase()}`;
  }

  private getRateLimitKey(email: string): string {
    return `otp:ratelimit:${email.trim().toLowerCase()}`;
  }

  private getAttemptsKey(email: string): string {
    return `otp:attempts:${email.trim().toLowerCase()}`;
  }

  private clearMemoryOtp(key: string, attemptsKey: string): void {
    this.memoryFallback.delete(key);
    this.attemptsMemory.delete(attemptsKey);
  }

  private async clearRedisAndMemoryOtp(key: string, attemptsKey: string): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.del(key);
      await this.redisClient.del(attemptsKey);
    }
    this.clearMemoryOtp(key, attemptsKey);
  }

  private verifyAndConsumeFromMemory(
    key: string,
    attemptsKey: string,
    trimmedInput: string,
    maxFailedAttempts: number,
  ): boolean {
    const memoryRecord = this.memoryFallback.get(key);
    if (!memoryRecord) return false;

    if (Date.now() > memoryRecord.expiresAt) {
      this.clearMemoryOtp(key, attemptsKey);
      return false;
    }

    const currentAttempts = this.attemptsMemory.get(attemptsKey) || 0;
    if (currentAttempts >= maxFailedAttempts) {
      this.clearMemoryOtp(key, attemptsKey);
      return false;
    }

    if (memoryRecord.otp === trimmedInput) {
      this.clearMemoryOtp(key, attemptsKey);
      return true;
    }

    const newAttempts = currentAttempts + 1;
    this.attemptsMemory.set(attemptsKey, newAttempts);
    if (newAttempts >= maxFailedAttempts) {
      this.clearMemoryOtp(key, attemptsKey);
    }

    return false;
  }

  /**
   * Kiểm tra thời gian chờ gửi lại (Cooldown, mặc định 60 giây)
   */
  public async checkCooldown(
    email: string,
  ): Promise<{ allowed: boolean; remainingSeconds: number }> {
    await this.ensureReady();
    const key = this.getCooldownKey(email);

    if (this.isRedisConnected && this.redisClient) {
      try {
        const ttl = await this.redisClient.ttl(key);
        if (ttl > 0) {
          return { allowed: false, remainingSeconds: ttl };
        }
      } catch (err) {
        console.warn('[RedisOtpStore] Kiểm tra cooldown Redis lỗi, dùng RAM:', err);
      }
    }

    const memExp = this.cooldownMemory.get(key);
    if (memExp && memExp > Date.now()) {
      const remainingSeconds = Math.max(1, Math.ceil((memExp - Date.now()) / 1000));
      return { allowed: false, remainingSeconds };
    }

    return { allowed: true, remainingSeconds: 0 };
  }

  /**
   * Thiết lập thời gian chờ gửi lại (Cooldown, mặc định 60 giây)
   */
  public async setCooldown(email: string, cooldownSeconds: number = 60): Promise<void> {
    await this.ensureReady();
    const key = this.getCooldownKey(email);
    this.cooldownMemory.set(key, Date.now() + cooldownSeconds * 1000);

    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.set(key, '1', 'EX', cooldownSeconds);
      } catch (err) {
        console.warn('[RedisOtpStore] Ghi cooldown Redis lỗi:', err);
      }
    }
  }

  /**
   * Kiểm tra và tăng giới hạn số lần gửi OTP (Rate Limit, mặc định tối đa 5 lần / 1 giờ)
   */
  public async checkAndIncrementRateLimit(
    email: string,
    maxAttempts: number = 5,
    windowSeconds: number = 3600,
  ): Promise<{ allowed: boolean; remainingMinutes: number }> {
    await this.ensureReady();
    const key = this.getRateLimitKey(email);

    if (this.isRedisConnected && this.redisClient) {
      try {
        const count = await this.redisClient.incr(key);
        if (count === 1) {
          await this.redisClient.expire(key, windowSeconds);
        }
        if (count > maxAttempts) {
          const ttl = await this.redisClient.ttl(key);
          const remainingMinutes = Math.max(1, Math.ceil(ttl / 60));
          return { allowed: false, remainingMinutes };
        }
        return { allowed: true, remainingMinutes: 0 };
      } catch (err) {
        console.warn('[RedisOtpStore] Kiểm tra rate limit Redis lỗi, dùng RAM:', err);
      }
    }

    const now = Date.now();
    const mem = this.rateLimitMemory.get(key);
    if (!mem || now > mem.resetAt) {
      this.rateLimitMemory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      return { allowed: true, remainingMinutes: 0 };
    }

    mem.count += 1;
    if (mem.count > maxAttempts) {
      const remainingMinutes = Math.max(1, Math.ceil((mem.resetAt - now) / 60000));
      return { allowed: false, remainingMinutes };
    }

    return { allowed: true, remainingMinutes: 0 };
  }

  /**
   * Lưu mã OTP với thời hạn sống TTL (mặc định 300 giây = 5 phút)
   */
  public async saveOtp(email: string, otp: string, ttlSeconds: number = 300): Promise<void> {
    await this.ensureReady();
    const key = this.getKey(email);
    const attemptsKey = this.getAttemptsKey(email);
    const normalizedOtp = otp.trim();
    const expiresAt = Date.now() + ttlSeconds * 1000;

    this.attemptsMemory.delete(attemptsKey);

    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.set(key, normalizedOtp, 'EX', ttlSeconds);
        await this.redisClient.del(attemptsKey);
        this.memoryFallback.set(key, {
          otp: normalizedOtp,
          expiresAt,
          fallbackOnly: false,
        });
        return;
      } catch (err) {
        console.warn('[RedisOtpStore] Ghi Redis thất bại, đã lưu vào RAM fallback:', err);
      }
    }

    this.memoryFallback.set(key, {
      otp: normalizedOtp,
      expiresAt,
      fallbackOnly: true,
    });
  }

  /**
   * Xác thực và tiêu thụ mã OTP (dùng một lần, bảo vệ chống brute-force tối đa 5 lần thử sai)
   */
  public async verifyAndConsumeOtp(
    email: string,
    inputOtp: string,
    maxFailedAttempts: number = 5,
  ): Promise<boolean> {
    await this.ensureReady();
    const key = this.getKey(email);
    const attemptsKey = this.getAttemptsKey(email);
    const trimmedInput = String(inputOtp || '').trim();

    if (!trimmedInput) return false;

    if (this.isRedisConnected && this.redisClient) {
      try {
        const storedOtp = await this.redisClient.get(key);
        if (storedOtp) {
          const currentAttemptsStr = await this.redisClient.get(attemptsKey);
          const currentAttempts = currentAttemptsStr ? parseInt(currentAttemptsStr, 10) : 0;

          if (currentAttempts >= maxFailedAttempts) {
            await this.clearRedisAndMemoryOtp(key, attemptsKey);
            return false;
          }

          if (storedOtp.trim() === trimmedInput) {
            await this.clearRedisAndMemoryOtp(key, attemptsKey);
            return true;
          }

          const newAttempts = await this.redisClient.incr(attemptsKey);
          if (newAttempts === 1) {
            await this.redisClient.expire(attemptsKey, 300);
          }
          if (newAttempts >= maxFailedAttempts) {
            await this.clearRedisAndMemoryOtp(key, attemptsKey);
          }
          return false;
        }

        // Chỉ kiểm tra tiếp trong RAM khi OTP đó vốn được lưu ở chế độ fallback (chưa ghi được vào Redis).
        const fallbackRecord = this.memoryFallback.get(key);
        if (!fallbackRecord || !fallbackRecord.fallbackOnly) {
          this.clearMemoryOtp(key, attemptsKey);
          return false;
        }
      } catch (err) {
        console.warn('[RedisOtpStore] Đọc Redis lỗi, chuyển sang kiểm tra RAM:', err);
      }
    }

    return this.verifyAndConsumeFromMemory(key, attemptsKey, trimmedInput, maxFailedAttempts);
  }

  /**
   * Lấy mã OTP hiện tại (dành cho kiểm thử hoặc debugging)
   */
  public async getOtp(email: string): Promise<string | null> {
    await this.ensureReady();
    const key = this.getKey(email);
    if (this.isRedisConnected && this.redisClient) {
      try {
        const otp = await this.redisClient.get(key);
        if (otp) return otp;

        const mem = this.memoryFallback.get(key);
        if (mem && mem.fallbackOnly && Date.now() <= mem.expiresAt) {
          return mem.otp;
        }
        return null;
      } catch {}
    }
    const mem = this.memoryFallback.get(key);
    if (mem && Date.now() <= mem.expiresAt) {
      return mem.otp;
    }
    return null;
  }

  public close(): void {
    this.connectPromise = null;
    this.isInitialized = false;
    this.isRedisConnected = false;
    if (this.redisClient) {
      try {
        this.redisClient.disconnect();
      } catch {}
      this.redisClient = undefined;
    }
  }
}

export const defaultOtpStore = new RedisOtpStore();
