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
    if (client.stream && typeof client.stream.unref === 'function') {
      client.stream.unref();
    }
    console.log(`[Redis Connected] Kết nối thành công tới Redis tại ${config.host}:${config.port}`);
  });

  client.on('ready', () => {
    if (client.stream && typeof client.stream.unref === 'function') {
      client.stream.unref();
    }
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
 * Thời gian timeout mặc định cho thao tác PING kiểm tra sức khỏe (mili-giây)
 */
export const DEFAULT_PING_TIMEOUT_MS = 1500;

/**
 * Thực thi lệnh PING tới Redis với giới hạn thời gian (Timeout Wrapper - SCRUM-41)
 * Sử dụng Promise.race để đảm bảo request không bị treo khi Redis bị deadlock/lag mạng.
 */
export async function pingRedisWithTimeout(
  client: Redis,
  timeoutMs: number = DEFAULT_PING_TIMEOUT_MS,
): Promise<string> {
  let timer: NodeJS.Timeout | undefined;
  let isSettled = false;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      if (!isSettled) {
        reject(new Error(`Redis ping timed out sau ${timeoutMs}ms`));
      }
    }, timeoutMs);
    if (timer.unref) {
      timer.unref(); // Không giữ event loop của Node.js mở trong Unit Testing
    }
  });

  const pingPromise = new Promise<string>((resolve, reject) => {
    (async () => {
      try {
        if (client.status === 'wait' || client.status === 'close') {
          await client.connect();
        }
        const pong = await client.ping();
        resolve(pong);
      } catch (err) {
        reject(err);
      }
    })().catch(() => {
      // Bắt lỗi ngầm để tránh UnhandledPromiseRejection nếu timeout giải quyết trước
    });
  });

  try {
    const result = await Promise.race([pingPromise, timeoutPromise]);
    isSettled = true;
    return result;
  } catch (error) {
    isSettled = true;
    throw error;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

/**
 * Kiểm tra trạng thái sức khỏe (Health Check) của kết nối Redis bằng lệnh PING (SCRUM-41)
 * Trả về UP khi PING thành công, DOWN khi lỗi hoặc timeout.
 * Giới hạn thời gian ping để endpoint không bị treo.
 */
export async function checkRedisHealth(
  timeoutMs?: number,
  clientOverride?: Redis,
): Promise<RedisHealthStatus> {
  const config = currentConfig || loadRedisConfigFromEnv();
  const startTime = Date.now();
  const effectiveTimeout = timeoutMs || config.pingTimeoutMs || DEFAULT_PING_TIMEOUT_MS;

  const host = (clientOverride?.options as RedisOptions | undefined)?.host || config.host;
  const port = (clientOverride?.options as RedisOptions | undefined)?.port || config.port;

  try {
    const client = clientOverride || getRedisClient();
    const pong = await pingRedisWithTimeout(client, effectiveTimeout);
    const latencyMs = Date.now() - startTime;

    if (pong === 'PONG') {
      return {
        status: 'UP',
        host,
        port,
        latencyMs,
        timestamp: new Date().toISOString(),
      };
    }

    const unexpError = `Phản hồi không mong đợi từ Redis: "${pong}"`;
    console.error(`[Redis Health Check DOWN] ${unexpError} (${host}:${port})`);
    return {
      status: 'DOWN',
      host,
      port,
      error: unexpError,
      timestamp: new Date().toISOString(),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Redis Health Check DOWN] Không thể ping Redis (${host}:${port}): ${message}`);
    return {
      status: 'DOWN',
      host,
      port,
      error: `Không thể kết nối hoặc ping Redis (${host}:${port}): ${message}`,
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
