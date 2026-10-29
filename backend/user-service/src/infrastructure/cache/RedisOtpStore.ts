import Redis from 'ioredis';

export class RedisOtpStore {
  private redisClient?: Redis;
  private memoryFallback: Map<string, { otp: string; expiresAt: number }> = new Map();
  private cooldownMemory: Map<string, number> = new Map();
  private rateLimitMemory: Map<string, { count: number; resetAt: number }> = new Map();
  private isRedisConnected: boolean = false;
  private isInitialized: boolean = false;

  private initRedis() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Trong môi trường test hoặc không chỉ định bật Redis, dùng RAM để tránh treo socket
    if (process.env.NODE_ENV === 'test') {
      this.isRedisConnected = false;
      return;
    }

    try {
      const host = process.env.REDIS_HOST || '127.0.0.1';
      const port = Number(process.env.REDIS_PORT) || 6379;
      this.redisClient = new Redis({
        host,
        port,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
        lazyConnect: true,
      });

      this.redisClient
        .connect()
        .then(() => {
          this.isRedisConnected = true;
          console.log('[RedisOtpStore] ✅ Kết nối thành công tới Redis cho lưu trữ OTP.');
        })
        .catch((err) => {
          this.isRedisConnected = false;
          console.warn(
            '[RedisOtpStore] ⚠️ Không kết nối được Redis, sử dụng bộ nhớ RAM fallback:',
            err.message,
          );
        });

      this.redisClient.on('error', () => {
        this.isRedisConnected = false;
      });
    } catch {
      this.isRedisConnected = false;
    }
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

  /**
   * Kiểm tra thời gian chờ gửi lại (Cooldown, mặc định 60 giây)
   */
  public async checkCooldown(
    email: string,
  ): Promise<{ allowed: boolean; remainingSeconds: number }> {
    this.initRedis();
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
    this.initRedis();
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
    this.initRedis();
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
    this.initRedis();
    const key = this.getKey(email);
    this.memoryFallback.set(key, {
      otp: otp.trim(),
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.set(key, otp.trim(), 'EX', ttlSeconds);
      } catch (err) {
        console.warn('[RedisOtpStore] Ghi Redis thất bại, đã lưu vào RAM fallback:', err);
      }
    }
  }

  /**
   * Xác thực và tiêu thụ mã OTP (dùng một lần)
   */
  public async verifyAndConsumeOtp(email: string, inputOtp: string): Promise<boolean> {
    this.initRedis();
    const key = this.getKey(email);
    const trimmedInput = String(inputOtp || '').trim();

    if (!trimmedInput) return false;

    if (this.isRedisConnected && this.redisClient) {
      try {
        const storedOtp = await this.redisClient.get(key);
        if (storedOtp && storedOtp.trim() === trimmedInput) {
          await this.redisClient.del(key);
          this.memoryFallback.delete(key);
          return true;
        }
      } catch (err) {
        console.warn('[RedisOtpStore] Đọc Redis lỗi, chuyển sang kiểm tra RAM:', err);
      }
    }

    const memoryRecord = this.memoryFallback.get(key);
    if (!memoryRecord) return false;

    if (Date.now() > memoryRecord.expiresAt) {
      this.memoryFallback.delete(key);
      return false;
    }

    if (memoryRecord.otp === trimmedInput) {
      this.memoryFallback.delete(key);
      return true;
    }

    return false;
  }

  /**
   * Lấy mã OTP hiện tại (dành cho kiểm thử hoặc debugging)
   */
  public async getOtp(email: string): Promise<string | null> {
    this.initRedis();
    const key = this.getKey(email);
    if (this.isRedisConnected && this.redisClient) {
      try {
        const otp = await this.redisClient.get(key);
        if (otp) return otp;
      } catch {}
    }
    const mem = this.memoryFallback.get(key);
    if (mem && Date.now() <= mem.expiresAt) {
      return mem.otp;
    }
    return null;
  }

  public close(): void {
    if (this.redisClient) {
      try {
        this.redisClient.disconnect();
      } catch {}
    }
  }
}

export const defaultOtpStore = new RedisOtpStore();
