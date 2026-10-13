/**
 * =============================================================================
 * Project Nexus - Auction Service (Bounded Context SRS 3.5)
 * Infrastructure Layer: Redis Client Factory & Lifecycle Manager
 * =============================================================================
 * Tương đương với Spring Data Redis ConnectionFactory / RedisTemplate Bean.
 * Quản lý khởi tạo Singleton Client, vòng đời kết nối, retry logic, timeout,
 * và chẩn đoán sức khỏe kết nối (Health Check).
 */

import Redis, { RedisOptions } from 'ioredis';
import { loadRedisConfigFromEnv, RedisConfig, RedisConfigError } from './RedisConfig';

export interface RedisHealthStatus {
  status: 'UP' | 'DOWN';
  host: string;
  port: number;
  latencyMs?: number;
  error?: string;
  timestamp: string;
}

let redisInstance: Redis | null = null;
let currentConfig: RedisConfig | null = null;

/**
 * Khởi tạo hoặc lấy Redis Client Singleton hiện tại.
 * Đọc cấu hình từ biến môi trường một cách an toàn.
 */
export function getRedisClient(customConfig?: Partial<RedisConfig>): Redis {
  if (redisInstance) {
    return redisInstance;
  }

  const config = customConfig
    ? { ...loadRedisConfigFromEnv(), ...customConfig }
    : loadRedisConfigFromEnv();

  currentConfig = config;

  const redisOptions: RedisOptions = {
    host: config.host,
    port: config.port,
    password: config.password,
    connectTimeout: config.timeoutMs,
    commandTimeout: config.timeoutMs,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true, // Kết nối chủ động để kiểm soát lỗi tốt hơn
    retryStrategy(times: number) {
      if (times > 5) {
        console.error(
          `[Redis Error] Đã thử kết nối lại ${times} lần tới ${config.host}:${config.port} nhưng không thành công. Dừng thử lại.`,
        );
        return null; // Dừng kết nối lại
      }
      const delay = Math.min(times * 500, 3000);
      console.warn(
        `[Redis Warning] Mất kết nối tới Redis (${config.host}:${config.port}). Thử lại lần ${times} sau ${delay}ms...`,
      );
      return delay;
    },
  };

  const client = new Redis(redisOptions);

  client.on('connect', () => {
    console.log(`[Redis Connected] Kết nối thành công tới Redis tại ${config.host}:${config.port}`);
  });

  client.on('ready', () => {
    console.log(`[Redis Ready] Redis client sẵn sàng tiếp nhận lệnh.`);
  });

  client.on('error', (err: Error) => {
    console.error(
      `[Redis Diagnostic Error] Lỗi kết nối Redis (${config.host}:${config.port}): ${err.message}`,
    );
  });

  client.on('close', () => {
    console.log(`[Redis Closed] Kết nối tới Redis đã đóng.`);
  });

  redisInstance = client;
  return client;
}

/**
 * Kiểm tra trạng thái sức khỏe (Health Check) của kết nối Redis bằng lệnh PING
 */
export async function checkRedisHealth(): Promise<RedisHealthStatus> {
  const config = currentConfig || loadRedisConfigFromEnv();
  const startTime = Date.now();

  try {
    const client = getRedisClient();

    // Kết nối nếu client chưa kết nối
    if (client.status === 'wait' || client.status === 'close') {
      await client.connect();
    }

    const pong = await client.ping();
    const latencyMs = Date.now() - startTime;

    if (pong === 'PONG') {
      return {
        status: 'UP',
        host: config.host,
        port: config.port,
        latencyMs,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      status: 'DOWN',
      host: config.host,
      port: config.port,
      error: `Phản hồi không mong đợi từ Redis: ${pong}`,
      timestamp: new Date().toISOString(),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: 'DOWN',
      host: config.host,
      port: config.port,
      error: `Không thể kết nối tới Redis (${config.host}:${config.port}): ${message}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Đóng kết nối Redis an toàn (Graceful Shutdown)
 */
export async function closeRedisClient(): Promise<void> {
  if (redisInstance) {
    try {
      if (redisInstance.status !== 'end') {
        await redisInstance.quit();
      }
    } catch {
      redisInstance.disconnect();
    } finally {
      redisInstance = null;
      currentConfig = null;
    }
  }
}

/**
 * Reset Redis instance phục vụ Unit Testing
 */
export async function resetRedisClientForTesting(): Promise<void> {
  await closeRedisClient();
}
